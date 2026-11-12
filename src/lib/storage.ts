import { hasReasoning } from "./reasoning.ts"; // relative imports so `node --test` can load them
import { isSources } from "./validate.ts";
import type { Guess, NodeCategory, TimelineNodeData } from "@/types/timeline";

const KEY = "whatif-timeline:v1";
const GUESS_KEY = "whatif-score:v1";
const CATEGORIES: NodeCategory[] = ["optimistic", "dystopian", "wildcard"];

const isNode = (v: unknown): v is TimelineNodeData => {
  const n = v as Record<string, unknown> | null;
  return (
    typeof n === "object" && n !== null &&
    typeof n.id === "string" && (n.parentId === null || typeof n.parentId === "string") &&
    typeof n.title === "string" && typeof n.summary === "string" && typeof n.keyDriver === "string" &&
    typeof n.yearOffset === "number" && typeof n.probability === "number" &&
    CATEGORIES.includes(n.category as NodeCategory) &&
    (n.rationale === undefined || hasReasoning(n)) && // nodes saved before reasoning existed have none
    (n.sources === undefined || isSources(n.sources))
  );
};

// A stored tree must be a strict tree: one root first, every other parent already present.
const isTree = (v: unknown): v is TimelineNodeData[] => {
  if (!Array.isArray(v) || !v.every(isNode) || v[0]?.parentId !== null) return false;
  const seen = new Set<string>();
  return v.every((n, i) => {
    const ok = i === 0 ? true : n.parentId !== null && seen.has(n.parentId);
    seen.add(n.id);
    return ok;
  });
};

export function loadTimeline(): TimelineNodeData[] {
  try {
    const raw = localStorage.getItem(KEY);
    const data: unknown = raw ? JSON.parse(raw) : [];
    return isTree(data) ? data : [];
  } catch {
    return []; // corrupted JSON or storage blocked: start fresh
  }
}

export function saveTimeline(items: TimelineNodeData[]): void {
  try {
    if (items.length) localStorage.setItem(KEY, JSON.stringify(items));
    else localStorage.removeItem(KEY);
  } catch {
    // quota exceeded or storage blocked: the session keeps working, it just won't persist
  }
}

const isGuess = (v: unknown): v is Guess => {
  const g = v as Record<string, unknown> | null;
  return (
    typeof g === "object" && g !== null &&
    CATEGORIES.includes(g.pick as NodeCategory) &&
    (g.rank === 1 || g.rank === 2 || g.rank === 3) &&
    typeof g.points === "number"
  );
};

export function loadGuesses(): Record<string, Guess> {
  try {
    const raw = localStorage.getItem(GUESS_KEY);
    const data: unknown = raw ? JSON.parse(raw) : {};
    const ok = typeof data === "object" && data !== null && !Array.isArray(data) && Object.values(data).every(isGuess);
    return ok ? (data as Record<string, Guess>) : {};
  } catch {
    return {};
  }
}

export function saveGuesses(guesses: Record<string, Guess>): void {
  try {
    if (Object.keys(guesses).length) localStorage.setItem(GUESS_KEY, JSON.stringify(guesses));
    else localStorage.removeItem(GUESS_KEY);
  } catch {
    // quota exceeded or storage blocked: scoring keeps working for this session
  }
}
