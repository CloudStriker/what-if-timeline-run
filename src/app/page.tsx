"use client";

import { useEffect, useRef, useState } from "react";
import { TimelineCanvas } from "@/components/canvas/TimelineCanvas";
import { NodeDetailDrawer } from "@/components/panels/NodeDetailDrawer";
import { RunSummary } from "@/components/panels/RunSummary";
import { ScenarioInput } from "@/components/panels/ScenarioInput";
import { ENDING_BONUS, runStatus, scoreGuess, summarize } from "@/lib/game";
import { loadGuesses, loadTimeline, saveGuesses, saveTimeline } from "@/lib/storage";
import { MAX_PATH_LENGTH, type Factor, type Guess, type NodeCategory, type Source, type StreamEvent, type TimelineNodeData } from "@/types/timeline";

// The route streams one JSON event per line.
async function* readEvents<R>(res: Response): AsyncGenerator<StreamEvent<R>> {
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    const lines = (buf + value).split("\n");
    buf = lines.pop()!;
    for (const line of lines) if (line) yield JSON.parse(line);
  }
}

export default function Home() {
  // null until localStorage is read on the client, which avoids a hydration mismatch and overwriting saved data.
  const [items, setItems] = useState<TimelineNodeData[] | null>(null);
  const [guesses, setGuesses] = useState<Record<string, Guess>>({});
  const [gain, setGain] = useState<{ points: number; key: number } | null>(null);
  const [summaryDismissed, setSummaryDismissed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage only exists on the client */
    setItems(loadTimeline());
    setGuesses(loadGuesses());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (items) {
      saveTimeline(items);
      saveGuesses(guesses);
    }
  }, [items, guesses]);

  if (!items) return <main className="h-screen w-screen" />;

  const selected = items.find((n) => n.id === selectedId) ?? null;
  const run = runStatus(items, guesses);

  // Root-to-node lineage only, per the context-window decision in the spec.
  const pathTo = (id: string): TimelineNodeData[] => {
    const path: TimelineNodeData[] = [];
    for (let n = items.find((i) => i.id === id); n; n = items.find((i) => i.id === n!.parentId)) path.unshift(n);
    return path;
  };

  const select = (id: string | null) => {
    setSelectedId(id);
    setError(null);
  };

  const start = (scenario: string) => {
    const root: TimelineNodeData = {
      id: crypto.randomUUID(),
      parentId: null,
      isRoot: true,
      yearOffset: 0,
      category: "wildcard",
      probability: 100,
      keyDriver: "User scenario",
      title: scenario,
      summary: "Starting point of this timeline.",
    };
    setItems([root]);
    setSummaryDismissed(false);
    select(root.id);
  };

  const reset = () => {
    // A finished run has nothing left to lose, so only confirm mid-run.
    if (!run.over && !window.confirm("Reset the timeline? All generated branches and your score will be deleted.")) return;
    abortRef.current?.abort();
    setItems([]);
    setGuesses({});
    setGain(null);
    setSummaryDismissed(false);
    select(null);
  };

  // Runs one agent job (expand or find evidence) for a node; only one can run at a time.
  async function runJob<R>(nodeId: string, url: string, body: unknown, onResult: (result: R) => void) {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoadingId(nodeId);
    setError(null);
    setActivity([]);
    setStartedAt(Date.now());
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const json: { error?: string } | null = await res.json().catch(() => null);
        throw new Error(json?.error ?? `Request failed (${res.status})`);
      }
      let done = false;
      for await (const ev of readEvents<R>(res)) {
        if (ev.type === "status") setActivity((a) => [...a, ev.text]);
        else if (ev.type === "error") throw new Error(ev.error);
        else {
          done = true;
          // Reset aborts the request, so a result never arrives for a timeline that no longer exists.
          onResult(ev);
        }
      }
      if (!done) throw new Error("Connection closed before the result arrived.");
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoadingId(null);
    }
  }

  const expand = (node: TimelineNodeData, pick: NodeCategory | null) =>
    runJob<{ branches: TimelineNodeData[] }>(
      node.id,
      "/api/timeline/branch",
      { scenario: items[0].title, pathHistory: pathTo(node.id) },
      ({ branches }) => {
        setItems((prev) => [...(prev ?? []), ...branches]);
        const guess = pick ? scoreGuess(pick, branches) : null;
        if (guess) setGuesses((g) => ({ ...g, [node.id]: guess }));
        // These branches are an ending when the expanded node was at the deepest expandable level.
        const bonus = pathTo(node.id).length === MAX_PATH_LENGTH ? ENDING_BONUS : 0;
        if (guess || bonus) setGain({ points: (guess?.points ?? 0) + bonus, key: Date.now() });
      },
    );

  const explain = (node: TimelineNodeData) =>
    runJob<{ reasoning: { rationale: string; factors: Factor[] } }>(
      node.id,
      "/api/timeline/reasoning",
      { scenario: items[0].title, pathHistory: pathTo(node.id) },
      ({ reasoning }) => setItems((prev) => (prev ?? []).map((n) => (n.id === node.id ? { ...n, ...reasoning } : n))),
    );

  const findEvidence = (node: TimelineNodeData) =>
    runJob<{ sources: Source[] }>(node.id, "/api/timeline/evidence", { scenario: items[0].title, node }, ({ sources }) =>
      setItems((prev) => (prev ?? []).map((n) => (n.id === node.id ? { ...n, sources } : n))),
    );

  const score = summarize(guesses, run.ending ? ENDING_BONUS : 0);
  // Deepest path reached (first one on ties), shown as "your story" in the summary.
  const deepest = items.reduce((best, n) => (pathTo(n.id).length > pathTo(best.id).length ? n : best), items[0]);

  const blockedReason = !selected
    ? null
    : items.some((n) => n.parentId === selected.id)
      ? "Already expanded"
      : pathTo(selected.id).length > MAX_PATH_LENGTH
        ? "Maximum depth reached"
        : run.over
          ? run.ending
            ? "Run complete"
            : "Out of energy"
          : loadingId
          ? "Another node is generating"
          : null;

  return (
    <main className="relative h-screen w-screen">
      <TimelineCanvas
        items={items}
        selectedId={selectedId}
        loadingId={loadingId}
        score={score}
        gain={gain}
        energy={run.energy}
        runOver={run.over}
        onShowSummary={run.over && summaryDismissed ? () => setSummaryDismissed(false) : undefined}
        onSelect={select}
        onReset={reset}
      />
      {items.length === 0 && <ScenarioInput onStart={start} />}
      {run.over && !summaryDismissed && items.length > 0 && (
        <RunSummary
          ending={run.ending}
          score={score}
          expansions={new Set(items.map((n) => n.parentId).filter(Boolean)).size}
          path={pathTo(deepest.id)}
          onNewRun={reset}
          onClose={() => setSummaryDismissed(true)}
        />
      )}
      {selected && (
        <NodeDetailDrawer
          node={selected}
          loading={loadingId === selected.id}
          error={error}
          activity={activity}
          guess={guesses[selected.id]}
          startedAt={startedAt}
          blockedReason={blockedReason}
          anyLoading={loadingId !== null}
          onExpand={(pick) => expand(selected, pick)}
          onExplain={() => explain(selected)}
          onFindEvidence={() => findEvidence(selected)}
          onCancel={() => abortRef.current?.abort()}
          onClose={() => select(null)}
        />
      )}
    </main>
  );
}
