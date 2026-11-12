// Run: node --test src/lib/storage.test.ts
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { loadGuesses, loadTimeline, saveGuesses, saveTimeline } from "./storage.ts";

const mem = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  },
});

const node = (id: string, parentId: string | null) => ({
  id, parentId, yearOffset: 1, title: "t", summary: "s", category: "wildcard" as const, probability: 50, keyDriver: "k",
});

beforeEach(() => mem.clear());

test("round-trips a valid tree and clears on empty", () => {
  const tree = [node("r", null), node("a", "r")];
  saveTimeline(tree);
  assert.deepEqual(loadTimeline(), tree);
  saveTimeline([]);
  assert.deepEqual(loadTimeline(), []);
});

test("rejects corrupted or non-tree data", () => {
  mem.set("whatif-timeline:v1", "{oops");
  assert.deepEqual(loadTimeline(), []);
  saveTimeline([node("r", null), node("a", "missing")]); // dangling parent
  assert.deepEqual(loadTimeline(), []);
  saveTimeline([node("a", "r")]); // first node is not a root
  assert.deepEqual(loadTimeline(), []);
});

test("guesses round-trip and bad data is ignored", () => {
  const g = { a: { pick: "wildcard" as const, rank: 2 as const, points: 5 } };
  saveGuesses(g);
  assert.deepEqual(loadGuesses(), g);
  mem.set("whatif-score:v1", JSON.stringify({ a: { pick: "nope", rank: 9, points: 1 } }));
  assert.deepEqual(loadGuesses(), {});
  saveGuesses({});
  assert.equal(mem.has("whatif-score:v1"), false);
});

test("accepts nodes with or without reasoning, rejects malformed reasoning", () => {
  const reasoned = { ...node("a", "r"), rationale: "why", factors: [{ effect: "raises" as const, note: "n" }, { effect: "lowers" as const, note: "m" }] };
  saveTimeline([node("r", null), reasoned]);
  assert.equal(loadTimeline().length, 2);
  saveTimeline([node("r", null), { ...reasoned, factors: "oops" } as never]);
  assert.deepEqual(loadTimeline(), []);
});

test("saved sources must be https links", () => {
  const src = { title: "t", summary: "s", url: "https://example.com/a" };
  saveTimeline([node("r", null), { ...node("a", "r"), sources: [src] }]);
  assert.equal(loadTimeline().length, 2);
  saveTimeline([node("r", null), { ...node("a", "r"), sources: [{ ...src, url: "javascript:alert(1)" }] }]);
  assert.deepEqual(loadTimeline(), []);
});
