"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import type { Guess, NodeCategory, TimelineNodeData } from "@/types/timeline";

interface Props {
  node: TimelineNodeData;
  loading: boolean;
  error: string | null;
  activity: string[];
  startedAt: number | null;
  guess: Guess | undefined;
  anyLoading: boolean;
  // Why expanding is unavailable, or null when it is allowed.
  blockedReason: string | null;
  onExpand: (pick: NodeCategory | null) => void;
  onExplain: () => void;
  onFindEvidence: () => void;
  onCancel: () => void;
  onClose: () => void;
}

const BAR: Record<NodeCategory, string> = {
  optimistic: "bg-emerald-400",
  dystopian: "bg-rose-400",
  wildcard: "bg-amber-400",
};

const HELP: Record<NodeCategory, string> = {
  optimistic: "Things go well: benefits spread and problems get solved.",
  dystopian: "Things go badly: harm, inequality, or loss of control.",
  wildcard: "An unexpected twist that neither clearly helps nor harms.",
};

const PICK: Record<NodeCategory, string> = {
  optimistic: "border-emerald-400 text-emerald-300 hover:bg-emerald-950",
  dystopian: "border-rose-400 text-rose-300 hover:bg-rose-950",
  wildcard: "border-amber-400 text-amber-300 hover:bg-amber-950",
};

const hostOf = (url: string) => new URL(url).hostname; // urls are validated https links

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200";

function AgentActivity({ steps, since }: { steps: string[]; since: number }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecs(Math.floor((Date.now() - since) / 1000)), 1000);
    return () => clearInterval(id);
  }, [since]);

  return (
    <div role="status" className="rounded-md border border-slate-700 bg-[#0b0b10] p-3 font-mono text-xs text-slate-300">
      <p className="mb-2 flex items-center gap-2 text-slate-50">
        <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
        Agent working · {secs}s
      </p>
      <ul className="flex flex-col gap-1">
        {steps.map((t, i) => (
          <li key={i}>✓ {t}</li>
        ))}
        <li className="text-slate-400">… thinking (can take a few minutes)<span className="blink" aria-hidden>_</span></li>
      </ul>
    </div>
  );
}

export function NodeDetailDrawer({ node, loading, error, activity, startedAt, guess, anyLoading, blockedReason, onExpand, onExplain, onFindEvidence, onCancel, onClose }: Props) {
  return (
    <aside
      aria-label="Node details"
      className="fixed inset-x-0 bottom-0 z-10 flex max-h-[70vh] flex-col gap-4 overflow-y-auto rounded-t-xl border-t border-slate-700 bg-[#14141b] p-5 shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-96 md:rounded-none md:border-l md:border-t-0"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-xs text-slate-300">
          {node.isRoot ? "Root scenario" : `+${node.yearOffset}y · ${node.category}`}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className={`-m-2 flex size-11 cursor-pointer items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 ${FOCUS}`}
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <h2 className="text-lg font-semibold leading-snug text-slate-50">{node.title}</h2>
      {!node.isRoot && <p className="-mt-2 text-xs text-slate-400">{HELP[node.category]}</p>}
      <p className="text-sm leading-relaxed text-slate-300">{node.summary}</p>

      <p className="flex items-center gap-2 text-sm text-slate-300">
        <Sparkles className="size-4 shrink-0" aria-hidden />
        Key driver: <span className="text-slate-50">{node.keyDriver}</span>
      </p>

      {!node.isRoot && (
        <div>
          <div className="mb-1 flex justify-between font-mono text-xs text-slate-300">
            <span>Probability</span>
            <span>{node.probability}%</span>
          </div>
          <div
            role="meter"
            aria-label="Probability"
            aria-valuemin={1}
            aria-valuemax={100}
            aria-valuenow={node.probability}
            className="h-2 overflow-hidden rounded bg-slate-800"
          >
            <div className={`h-full ${BAR[node.category]}`} style={{ width: `${node.probability}%` }} />
          </div>
        </div>
      )}

      {!node.isRoot && (
        <section aria-labelledby="why" className="flex flex-col gap-2">
          <h3 id="why" className="text-sm font-semibold text-slate-50">
            Why {node.probability}%?
          </h3>
          {node.rationale && node.factors ? (
            <>
              <p className="text-sm leading-relaxed text-slate-300">{node.rationale}</p>
              <ul className="flex flex-col gap-1.5 text-sm text-slate-300">
                {node.factors.map((f, i) => (
                  <li key={i} className="flex gap-2">
                    <span className={f.effect === "raises" ? "text-sky-300" : "text-slate-400"} aria-hidden>
                      {f.effect === "raises" ? "▲" : "▼"}
                    </span>
                    <span>
                      <span className="sr-only">{f.effect === "raises" ? "Raises probability: " : "Lowers probability: "}</span>
                      {f.note}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400">AI reasoning, not verified facts</p>
              {node.sources ? (
                <div className="mt-2 flex flex-col gap-2">
                  <h4 className="text-sm font-semibold text-slate-50">Related sources</h4>
                  <ul className="flex flex-col gap-3">
                    {node.sources.map((s) => (
                      <li key={s.url} className="text-sm">
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className={`font-medium text-sky-300 underline ${FOCUS}`}>
                          {s.title}
                        </a>
                        <span className="ml-2 font-mono text-xs text-slate-400">{hostOf(s.url)}</span>
                        <p className="mt-1 text-slate-300">{s.summary}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-slate-400">AI summaries of web pages, not verified quotes. Sources relate to the reasoning, not to the exact percentage.</p>
                </div>
              ) : (
                !loading && (
                  <button
                    type="button"
                    onClick={onFindEvidence}
                    disabled={anyLoading}
                    className={`mt-1 min-h-11 cursor-pointer rounded-md border border-slate-500 px-3 text-sm text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`}
                  >
                    {anyLoading ? "Another node is working" : "Find evidence"}
                  </button>
                )
              )}
            </>
          ) : (
            !loading && (
              <button
                type="button"
                onClick={onExplain}
                disabled={anyLoading}
                className={`min-h-11 cursor-pointer self-start rounded-md border border-slate-500 px-3 text-sm text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`}
              >
                {anyLoading ? "Another node is working" : "Explain this probability"}
              </button>
            )
          )}
        </section>
      )}

      {error && (
        <p role="alert" className="rounded-md border border-rose-500 bg-rose-950 p-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      {loading && startedAt !== null && <AgentActivity steps={activity} since={startedAt} />}

      {guess && !loading && (
        <p className="fade-up rounded-md border border-slate-600 bg-[#0b0b10] p-3 text-sm text-slate-100">
          You picked <span className="capitalize">{guess.pick}</span>: ranked #{guess.rank} by the AI&apos;s estimate (+{guess.points})
        </p>
      )}

      {loading ? (
        <button
          type="button"
          onClick={onCancel}
          className={`min-h-11 cursor-pointer rounded-md bg-slate-100 px-4 text-sm font-semibold text-slate-900 hover:bg-white ${FOCUS}`}
        >
          Cancel
        </button>
      ) : blockedReason ? (
        <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-md bg-slate-100 px-4 text-sm font-semibold text-slate-900 opacity-60">
          {blockedReason}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <p id="guess-label" className="text-sm font-semibold text-slate-50">
            Which future will the AI rate most likely?
          </p>
          <p className="-mt-1 text-xs text-slate-400">Costs 1 energy. A correct top pick refunds it.</p>
          <div role="group" aria-labelledby="guess-label" className="flex flex-col gap-2">
            {(Object.keys(PICK) as NodeCategory[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onExpand(c)}
                className={`min-h-11 cursor-pointer rounded-md border-2 px-3 py-2 text-left ${PICK[c]} ${FOCUS}`}
              >
                <span className="block text-sm font-semibold capitalize">{c}</span>
                <span className="block text-xs font-normal text-slate-300">{HELP[c]}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onExpand(null)}
            className={`min-h-11 cursor-pointer rounded-md text-sm text-slate-300 underline hover:text-slate-50 ${FOCUS}`}
          >
            Skip guess, just expand (1 energy)
          </button>
        </div>
      )}
    </aside>
  );
}
