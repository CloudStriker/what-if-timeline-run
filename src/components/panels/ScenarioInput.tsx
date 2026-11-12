"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

const PRESETS = [
  "Humanoid robots common by 2028",
  "AGI reaches medical research by 2027",
  "Fusion power goes commercial by 2030",
  "Most new cars are fully autonomous by 2029",
];

export function ScenarioInput({ onStart }: { onStart: (scenario: string) => void }) {
  const [text, setText] = useState("");
  const scenario = text.trim();

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (scenario) onStart(scenario);
        }}
        className="flex w-full max-w-xl flex-col gap-4 rounded-xl border border-slate-700 bg-[#14141b] p-5 shadow-2xl"
      >
        <label htmlFor="scenario" className="text-lg font-semibold text-slate-50">
          What if…?
        </label>
        <div className="flex gap-2">
          <input
            id="scenario"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={120}
            autoFocus
            placeholder="Describe a future to explore"
            className="min-h-11 min-w-0 flex-1 rounded-md border border-slate-600 bg-[#0b0b10] px-3 text-sm text-slate-50 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-slate-200"
          />
          <button
            type="submit"
            disabled={!scenario}
            aria-label="Start timeline"
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md bg-slate-100 text-slate-900 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowRight className="size-5" aria-hidden />
          </button>
        </div>
        <ul className="flex flex-wrap gap-2" aria-label="Preset scenarios">
          {PRESETS.map((p) => (
            <li key={p}>
              <button
                type="button"
                onClick={() => onStart(p)}
                className="min-h-11 cursor-pointer rounded-md border border-slate-600 px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-slate-200"
              >
                {p}
              </button>
            </li>
          ))}
        </ul>
      </form>
    </div>
  );
}
