import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Loader2, Sparkles } from "lucide-react";
import { NODE_HEIGHT, NODE_WIDTH } from "@/lib/dagre-layout";
import type { NodeCategory, TimelineNodeData } from "@/types/timeline";

export type TimelineFlowNode = Node<TimelineNodeData & { isLoading?: boolean; isTop?: boolean; enterDelay?: number } & Record<string, unknown>, "timeline">;

type Tone = NodeCategory | "root";

// glow is a soft category-colored halo (HUD accent), never the only carrier of meaning

// Full class strings so Tailwind can detect them.
const TONE: Record<Tone, { border: string; glow: string; selected: string; badge: string; label: string }> = {
  root: { border: "border-zinc-400", glow: "shadow-[0_0_14px_-3px_rgba(161,161,170,0.35)]", selected: "ring-zinc-300", badge: "bg-zinc-800 text-zinc-100", label: "Root" },
  optimistic: { border: "border-emerald-400", glow: "shadow-[0_0_16px_-3px_rgba(52,211,153,0.5)]", selected: "ring-emerald-300", badge: "bg-emerald-950 text-emerald-300", label: "Optimistic" },
  dystopian: { border: "border-rose-400", glow: "shadow-[0_0_16px_-3px_rgba(251,113,133,0.5)]", selected: "ring-rose-300", badge: "bg-rose-950 text-rose-300", label: "Dystopian" },
  wildcard: { border: "border-amber-400", glow: "shadow-[0_0_16px_-3px_rgba(251,191,36,0.5)]", selected: "ring-amber-300", badge: "bg-amber-950 text-amber-300", label: "Wildcard" },
};

export function TimelineNode({ data, selected }: NodeProps<TimelineFlowNode>) {
  const tone = TONE[data.isRoot ? "root" : data.category];

  return (
    <div
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT, animationDelay: `${data.enterDelay ?? 0}ms` }}
      className={`node-in relative flex cursor-pointer flex-col gap-1.5 overflow-hidden rounded-lg border-2 bg-[#14141b] p-2.5 text-left ${tone.glow} ${tone.border} ${
        selected ? `ring-2 ring-offset-2 ring-offset-[#0b0b10] ${tone.selected}` : ""
      }`}
    >
      {!data.isRoot && <Handle type="target" position={Position.Top} className="!bg-zinc-400" />}

      <div className="flex items-center justify-between gap-2 font-mono text-xs">
        <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-100">
          {data.isRoot ? "Now" : `+${data.yearOffset}y`}
        </span>
        <span className={`rounded px-2 py-0.5 ${tone.badge}`}>{tone.label}</span>
        {!data.isRoot && (
          <span className={`rounded px-2 py-0.5 ${tone.badge}`} aria-label={`Probability ${data.probability} percent`}>
            {data.probability}%
          </span>
        )}
      </div>

      <h3 className="line-clamp-2 shrink-0 text-sm font-semibold leading-snug text-slate-50">{data.title}</h3>
      <p className="line-clamp-1 text-xs leading-relaxed text-slate-300">{data.summary}</p>
      <div className="mt-auto flex items-center gap-2 text-xs text-slate-400">
        <Sparkles className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{data.keyDriver}</span>
        {data.isTop && <span className="badge-pop badge-shimmer ml-auto shrink-0 rounded bg-slate-100 px-1.5 font-medium text-slate-900">★ Most likely</span>}
        {data.isLoading && <Loader2 className="ml-auto size-4 shrink-0 animate-spin text-slate-200 motion-reduce:animate-none" aria-label="Generating branches" />}
      </div>

      {selected && <span className="breathe-overlay pointer-events-none absolute inset-0 rounded-md" aria-hidden />}
      {data.isLoading && <span className="scan-overlay pointer-events-none absolute inset-0 rounded-md" aria-hidden />}

      <Handle type="source" position={Position.Bottom} className="!bg-zinc-400" />
    </div>
  );
}
