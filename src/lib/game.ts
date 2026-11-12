import type { Guess, NodeCategory, TimelineNodeData } from "@/types/timeline";
import { MAX_PATH_LENGTH } from "../types/timeline.ts"; // relative so `node --test` can load it

const POINTS = [10, 5, 2] as const;
export const MAX_ENERGY = 6;
export const ENDING_BONUS = 25;

// Scale to a total of exactly 100 (largest remainder), keeping every value at least 1.
export function normalizeTo100(values: number[]): number[] {
  const total = values.reduce((a, b) => a + b, 0);
  const raw = values.map((v) => (v * 100) / total);
  const out = raw.map(Math.floor);
  const left = 100 - out.reduce((a, b) => a + b, 0);
  raw
    .map((r, i) => [r - out[i], i] as const)
    .sort((a, b) => b[0] - a[0])
    .slice(0, left)
    .forEach(([, i]) => out[i]++);
  out.forEach((v, i) => {
    if (v === 0) {
      out[i] = 1;
      out[out.indexOf(Math.max(...out))]--;
    }
  });
  return out;
}

// Rank by probability; ties share the better rank.
export function scoreGuess(pick: NodeCategory, branches: TimelineNodeData[]): Guess {
  const mine = branches.find((b) => b.category === pick)!.probability;
  const rank = (1 + branches.filter((b) => b.probability > mine).length) as Guess["rank"];
  return { pick, rank, points: POINTS[rank - 1] };
}

export function summarize(guesses: Record<string, Guess>, bonus = 0) {
  const list = Object.values(guesses); // string keys keep insertion order, so this is chronological
  let streak = 0;
  for (let i = list.length - 1; i >= 0 && list[i].rank === 1; i--) streak++;
  return {
    points: list.reduce((sum, g) => sum + g.points, bonus),
    total: list.length,
    topPicks: list.filter((g) => g.rank === 1).length,
    streak,
  };
}

export type Score = ReturnType<typeof summarize>;

export function rankTitle({ total, topPicks }: Score): string {
  if (total < 3) return "Rookie";
  const accuracy = topPicks / total;
  if (accuracy >= 0.7 && total >= 5) return "Oracle";
  return accuracy >= 0.4 ? "Strategist" : "Analyst";
}

// Ids of the most likely child in each sibling group (ties included).
export function topIds(items: TimelineNodeData[]): Set<string> {
  const best = new Map<string, number>();
  for (const n of items) if (n.parentId) best.set(n.parentId, Math.max(best.get(n.parentId) ?? 0, n.probability));
  return new Set(items.filter((n) => n.parentId && n.probability === best.get(n.parentId)).map((n) => n.id));
}

// Run state is derived from the tree and guesses, so a failed or cancelled expand costs nothing
// and nothing can drift out of sync after a refresh.
export function runStatus(items: TimelineNodeData[], guesses: Record<string, Guess>) {
  const expanded = new Set(items.map((n) => n.parentId).filter(Boolean)).size;
  const refunds = Object.values(guesses).filter((g) => g.rank === 1).length;
  const energy = Math.max(0, MAX_ENERGY - expanded + refunds);

  const byId = new Map(items.map((n) => [n.id, n]));
  const pathLength = (n: TimelineNodeData) => {
    let count = 0;
    for (let x: TimelineNodeData | undefined = n; x; x = byId.get(x.parentId ?? "")) count++;
    return count;
  };
  // A node whose root path is longer than the expandable limit is an ending.
  const ending = items.some((n) => pathLength(n) > MAX_PATH_LENGTH);
  return { energy, ending, over: ending || energy === 0 };
}
