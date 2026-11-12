import type { NodeCategory } from "@/types/timeline";

export const CATEGORIES: NodeCategory[] = ["optimistic", "dystopian", "wildcard"];

export const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
export const isStr = (v: unknown, max: number): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= max;
export const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

// Fields shared by client-sent nodes and LLM-generated branches.
export function hasContentFields(o: Record<string, unknown>): boolean {
  return (
    isInt(o.yearOffset, 0, 100) &&
    isStr(o.title, 120) &&
    isStr(o.summary, 400) &&
    CATEGORIES.includes(o.category as NodeCategory) &&
    isInt(o.probability, 1, 100) &&
    isStr(o.keyDriver, 80)
  );
}

// 1-3 related pages with https links; used for saved nodes and resolved search results.
export function isSources(v: unknown): boolean {
  return (
    Array.isArray(v) &&
    v.length >= 1 &&
    v.length <= 3 &&
    v.every((s) => isObj(s) && isStr(s.title, 200) && isStr(s.summary, 400) && isStr(s.url, 2000) && s.url.startsWith("https://"))
  );
}
