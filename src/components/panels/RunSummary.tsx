"use client";

import { useEffect } from "react";
import { Trophy, Zap } from "lucide-react";
import { rankTitle, type Score } from "@/lib/game";
import type { TimelineNodeData } from "@/types/timeline";

interface Props {
  ending: boolean;
  score: Score;
  expansions: number;
  path: TimelineNodeData[]; // deepest root-to-node path reached
  onNewRun: () => void;
  onClose: () => void;
}

export function RunSummary({ ending, score, expansions, path, onNewRun, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const Icon = ending ? Trophy : Zap;
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="run-title" className="fade-up flex max-h-full w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl border border-sky-400/40 bg-[#14141b] p-5 shadow-[0_0_30px_-6px_rgba(125,211,252,0.4)]">
        <h2 id="run-title" className="flex items-center gap-2 text-lg font-semibold text-slate-50">
          <Icon className="size-5 text-sky-300" aria-hidden />
          {ending ? "Ending reached" : "Out of energy"}
        </h2>

        <dl className="grid grid-cols-2 gap-3 font-mono text-sm sm:grid-cols-4">
          {[
            ["Rank", rankTitle(score)],
            ["Points", String(score.points)],
            ["Top picks", `${score.topPicks}/${score.total}`],
            ["Expansions", String(expansions)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-slate-700 bg-[#0b0b10] p-2">
              <dt className="text-xs text-slate-400">{label}</dt>
              <dd className="text-slate-50">{value}</dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="path-title" className="flex flex-col gap-2">
          <h3 id="path-title" className="text-sm font-semibold text-slate-50">
            Your path
          </h3>
          <ol className="flex flex-col gap-1.5 text-sm text-slate-300">
            {path.map((n) => (
              <li key={n.id} className="flex gap-2">
                <span className="w-10 shrink-0 font-mono text-xs text-slate-400">{n.isRoot ? "Now" : `+${n.yearOffset}y`}</span>
                <span>{n.title}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onNewRun}
            autoFocus
            className="min-h-11 cursor-pointer rounded-md bg-slate-100 px-4 text-sm font-semibold text-slate-900 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200"
          >
            New run
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 cursor-pointer rounded-md border border-slate-500 px-4 text-sm text-slate-100 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-slate-200"
          >
            View timeline
          </button>
        </div>
      </div>
    </div>
  );
}
