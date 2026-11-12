"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Background, Controls, Panel, ReactFlow, useReactFlow, type Edge } from "@xyflow/react";
import { toPng } from "html-to-image";
import { Download, Flame, RotateCcw, Trophy, Zap } from "lucide-react";
import "@xyflow/react/dist/style.css";
import { NODE_HEIGHT, NODE_WIDTH, getLayoutedElements } from "@/lib/dagre-layout";
import { MAX_ENERGY, rankTitle, topIds, type Score } from "@/lib/game";
import type { TimelineNodeData } from "@/types/timeline";
import { TimelineEdge } from "./TimelineEdge";
import { TimelineNode, type TimelineFlowNode } from "./TimelineNode";

const nodeTypes = { timeline: TimelineNode };
const edgeTypes = { timeline: TimelineEdge };

const EXPORT_PADDING = 48;
const STAGGER_MS = 120; // siblings appear one after another
// Explicit stroke: the default comes from a CSS variable on an ancestor, which the PNG export (viewport only) loses.
const EDGE_STYLE = { stroke: "#64748b", strokeWidth: 1.5 };

// Counts the displayed number up to `target` (instantly when the user prefers reduced motion).
function useCountUp(target: number): number {
  const [shown, setShown] = useState(target);
  const current = useRef(target);
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduce) return;
    const from = current.current;
    const start = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const t = Math.min((now - start) / 600, 1);
      current.current = Math.round(from + (target - from) * t);
      setShown(current.current);
      if (t < 1) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [target, reduce]);

  return reduce ? target : shown;
}
const BTN =
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-slate-600 bg-[#14141b] px-3 text-sm text-slate-100 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-slate-200";

// Refit when the tree grows so new levels are never off-screen; also downloads the whole tree as PNG.
interface ToolsProps {
  count: number;
  score: Score;
  gain: { points: number; key: number } | null;
  energy: number;
  runOver: boolean;
  onShowSummary?: () => void; // only when the summary was dismissed
  onReset: () => void;
}

function CanvasTools({ count, score, gain, energy, runOver, onShowSummary, onReset }: ToolsProps) {
  const { fitView, getNodes, getNodesBounds } = useReactFlow();
  const points = useCountUp(score.points);

  useEffect(() => {
    if (!count) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = requestAnimationFrame(() => fitView({ padding: 0.3, duration: reduce ? 0 : 300 }));
    return () => cancelAnimationFrame(id);
  }, [count, fitView]);

  const download = async () => {
    const viewport = document.querySelector<HTMLElement>(".react-flow__viewport");
    if (!viewport) return;
    const b = getNodesBounds(getNodes());
    const width = b.width + EXPORT_PADDING * 2;
    const height = b.height + EXPORT_PADDING * 2;
    // Render the viewport at 1:1 shifted so the whole tree sits inside the image.
    const url = await toPng(viewport, {
      backgroundColor: "#0b0b10",
      width,
      height,
      style: { width: `${width}px`, height: `${height}px`, transform: `translate(${EXPORT_PADDING - b.x}px, ${EXPORT_PADDING - b.y}px) scale(1)` },
    });
    const a = document.createElement("a");
    a.download = "timeline.png";
    a.href = url;
    a.click();
  };

  if (!count) return null;
  return (
    <Panel position="top-left" className="flex flex-wrap gap-2">
      <button type="button" onClick={download} className={BTN}>
        <Download className="size-4" aria-hidden /> Download PNG
      </button>
      <button type="button" onClick={onReset} className={BTN}>
        <RotateCcw className="size-4" aria-hidden /> {runOver ? "New run" : "Reset"}
      </button>
      {onShowSummary && (
        <button type="button" onClick={onShowSummary} className={BTN}>
          <Trophy className="size-4" aria-hidden /> Summary
        </button>
      )}
      <span role="status" className="flex min-h-11 items-center gap-2 rounded-md border border-slate-600 bg-[#14141b] px-3 font-mono text-sm text-slate-100">
        <Zap className="size-4 text-sky-300" aria-hidden />
        <span className="sr-only">Energy {energy} of {MAX_ENERGY}</span>
        <span aria-hidden className="flex gap-1">
          {Array.from({ length: MAX_ENERGY }, (_, i) => (
            <span key={i} className={`h-3 w-2 rounded-sm ${i < energy ? "bg-sky-300" : "bg-slate-700"}`} />
          ))}
        </span>
      </span>
      {(score.total > 0 || score.points > 0) && (
        <div className="relative">
          <span
            role="status"
            className="flex min-h-11 items-center gap-3 rounded-md border border-sky-400/40 bg-[#14141b] px-3 font-mono text-sm text-slate-100 shadow-[0_0_12px_-2px_rgba(125,211,252,0.35)]"
          >
            <span className="font-semibold text-sky-300">{rankTitle(score)}</span>
            <span>
              <span className="sr-only">{score.points}</span>
              <span aria-hidden>{points}</span> pts · {score.topPicks}/{score.total} top picks
            </span>
            {score.streak >= 2 && (
              <span className="flex items-center gap-1 text-orange-300">
                <Flame className="size-4" aria-hidden />
                {score.streak}
                <span className="sr-only"> in a row</span>
              </span>
            )}
          </span>
          {gain && (
            <span key={gain.key} aria-hidden className="float-up pointer-events-none absolute -top-1 right-3 font-mono text-sm font-bold text-emerald-300">
              +{gain.points}
            </span>
          )}
        </div>
      )}
    </Panel>
  );
}

interface Props {
  items: TimelineNodeData[];
  selectedId: string | null;
  loadingId: string | null;
  onSelect: (id: string | null) => void;
  score: Score;
  gain: { points: number; key: number } | null;
  energy: number;
  runOver: boolean;
  onShowSummary?: () => void;
  onReset: () => void;
}

export function TimelineCanvas({ items, selectedId, loadingId, score, gain, energy, runOver, onShowSummary, onSelect, onReset }: Props) {
  // Re-layout whenever the tree changes; selection/loading are applied after so they don't move nodes.
  const layouted = useMemo(() => {
    const seen = new Map<string, number>(); // sibling index per parent
    const delays = new Map(items.map((d) => {
      const i = seen.get(d.parentId ?? "") ?? 0;
      seen.set(d.parentId ?? "", i + 1);
      return [d.id, i * STAGGER_MS];
    }));
    const nodes: TimelineFlowNode[] = items.map((d) => ({
      id: d.id,
      type: "timeline",
      position: { x: 0, y: 0 },
      width: NODE_WIDTH, // known size lets fitView and export bounds work before measurement
      height: NODE_HEIGHT,
      data: { ...d, enterDelay: delays.get(d.id) }, // spread: interfaces lack the index signature React Flow requires
    }));
    const edges: Edge[] = items
      .filter((d) => d.parentId)
      .map((d) => ({
        id: `${d.parentId}-${d.id}`,
        source: d.parentId!,
        target: d.id,
        type: "timeline",
        className: "edge-in",
        style: { ...EDGE_STYLE, animationDelay: `${(delays.get(d.id) ?? 0) + 150}ms` },
      }));
    return getLayoutedElements(nodes, edges);
  }, [items]);

  // Node ids from the root down to the selected node; their incoming edges carry the energy dots.
  const lineage = useMemo(() => {
    const byId = new Map(items.map((n) => [n.id, n]));
    const ids = new Set<string>();
    for (let n = byId.get(selectedId ?? ""); n; n = byId.get(n.parentId ?? "")) ids.add(n.id);
    return ids;
  }, [items, selectedId]);

  // The edge into the node being worked on flows (dashed) while the agent runs, unless it already shows the energy dots.
  const edges = useMemo(
    () =>
      layouted.edges.map((e) => {
        const active = lineage.has(e.target);
        return { ...e, data: { active }, animated: e.target === loadingId && !active };
      }),
    [layouted, loadingId, lineage],
  );

  const tops = useMemo(() => topIds(items), [items]);

  const nodes = useMemo(
    () =>
      layouted.nodes.map((n) => ({
        ...n,
        selected: n.id === selectedId,
        data: { ...n.data, isLoading: n.id === loadingId, isTop: tops.has(n.id) },
      })),
    [layouted, selectedId, loadingId, tops],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={(_, node) => onSelect(node.id)}
      onPaneClick={() => onSelect(null)}
      colorMode="dark"
      nodesDraggable={false}
      nodesConnectable={false}
      minZoom={0.2}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#2a2a36" gap={24} />
      <Controls showInteractive={false} />
      <CanvasTools count={items.length} score={score} gain={gain} energy={energy} runOver={runOver} onShowSummary={onShowSummary} onReset={onReset} />
    </ReactFlow>
  );
}
