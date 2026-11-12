// Run: node --test src/lib/json.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseFirstJson } from "./json.ts";

test("takes the first object and ignores trailing or leading text", () => {
  assert.deepEqual(parseFirstJson('{"a":1}\n{"b":2}'), { a: 1 });
  assert.deepEqual(parseFirstJson('Here you go:\n{"a":{"b":[1,2]}}\nDone.'), { a: { b: [1, 2] } });
});

test("braces and escaped quotes inside strings do not end the object", () => {
  assert.deepEqual(parseFirstJson('{"t":"a } b \\" { c"} extra'), { t: 'a } b " { c' });
});

test("throws on missing or unterminated JSON", () => {
  assert.throws(() => parseFirstJson("no json here"));
  assert.throws(() => parseFirstJson('{"a":1'));
});
