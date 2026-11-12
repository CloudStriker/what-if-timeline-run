// Run: node --test src/lib/game.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeTo100, rankTitle, runStatus, scoreGuess, summarize, topIds } from "./game.ts";

const b = (id: string, category: "optimistic" | "dystopian" | "wildcard", probability: number) => ({
  id, parentId: "r", yearOffset: 1, title: "t", summary: "s", category, probability, keyDriver: "k",
});

test("normalizeTo100 always totals 100 and keeps values >= 1", () => {
  for (const input of [[65, 40, 15], [45, 30, 25], [1, 60, 80], [100, 100, 100], [1, 1, 98]]) {
    const out = normalizeTo100(input);
    assert.equal(out.reduce((a, c) => a + c, 0), 100, JSON.stringify(input));
    assert.ok(out.every((v) => v >= 1), JSON.stringify(out));
  }
  assert.deepEqual(normalizeTo100([50, 30, 20]), [50, 30, 20]);
});

test("scoreGuess ranks by probability and shares rank on ties", () => {
  const branches = [b("a", "optimistic", 50), b("b", "dystopian", 30), b("c", "wildcard", 20)];
  assert.deepEqual(scoreGuess("optimistic", branches), { pick: "optimistic", rank: 1, points: 10 });
  assert.deepEqual(scoreGuess("dystopian", branches), { pick: "dystopian", rank: 2, points: 5 });
  assert.deepEqual(scoreGuess("wildcard", branches), { pick: "wildcard", rank: 3, points: 2 });
  const tie = [b("a", "optimistic", 40), b("b", "dystopian", 40), b("c", "wildcard", 20)];
  assert.equal(scoreGuess("dystopian", tie).rank, 1);
});

test("summarize and topIds", () => {
  assert.deepEqual(summarize({ x: { pick: "wildcard", rank: 1, points: 10 }, y: { pick: "optimistic", rank: 3, points: 2 } }), {
    points: 12, total: 2, topPicks: 1, streak: 0,
  });
  const root = { ...b("r", "wildcard", 100), parentId: null };
  assert.deepEqual([...topIds([root, b("a", "optimistic", 50), b("b", "dystopian", 30)])], ["a"]);
});

test("streak counts trailing top picks and rank title follows accuracy", () => {
  const g = (rank: 1 | 2 | 3) => ({ pick: "wildcard" as const, rank, points: 1 });
  assert.equal(summarize({ a: g(2), b: g(1), c: g(1) }).streak, 2);
  assert.equal(summarize({ a: g(1), b: g(1), c: g(3) }).streak, 0);
  assert.equal(rankTitle({ points: 0, total: 2, topPicks: 2, streak: 2 }), "Rookie");
  assert.equal(rankTitle({ points: 0, total: 5, topPicks: 4, streak: 0 }), "Oracle");
  assert.equal(rankTitle({ points: 0, total: 4, topPicks: 4, streak: 4 }), "Strategist"); // too few guesses for Oracle
  assert.equal(rankTitle({ points: 0, total: 5, topPicks: 1, streak: 0 }), "Analyst");
});

test("runStatus derives energy, ending, and run over", () => {
  const chain = (n: number) => Array.from({ length: n }, (_, i) => ({ ...b(`n${i}`, "wildcard", 50), parentId: i === 0 ? null : `n${i - 1}` }));
  const top = { pick: "wildcard" as const, rank: 1 as const, points: 10 };
  assert.deepEqual(runStatus(chain(1), {}), { energy: 6, ending: false, over: false });
  // 3 nodes = 2 expanded; a rank-1 guess refunds one
  assert.equal(runStatus(chain(3), { n0: top }).energy, 5);
  // 5-node chain: the 4th node was expanded, so n4 is an ending (path longer than the limit)
  assert.deepEqual(runStatus(chain(5), {}), { energy: 2, ending: true, over: true });
  // out of energy without an ending: 6 expansions in a wide tree
  const wide = [{ ...b("r", "wildcard", 50), parentId: null }, ...Array.from({ length: 6 }, (_, i) => ({ ...b(`p${i}`, "wildcard", 50), parentId: i === 0 ? "r" : `p${i - 1}` }))];
  assert.equal(runStatus(wide.slice(0, 7), {}).energy, 0);
});

test("summarize adds the ending bonus", () => {
  assert.equal(summarize({}, 25).points, 25);
});
