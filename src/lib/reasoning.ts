// Shared by the API route (LLM output) and storage (saved nodes): rationale plus 2-4 up/down factors.
export function hasReasoning(o: Record<string, unknown>): boolean {
  const text = (v: unknown, max: number) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
  return (
    text(o.rationale, 300) &&
    Array.isArray(o.factors) &&
    o.factors.length >= 2 &&
    o.factors.length <= 4 &&
    o.factors.every((f) => {
      const x = f as Record<string, unknown> | null;
      return typeof x === "object" && x !== null && (x.effect === "raises" || x.effect === "lowers") && text(x.note, 160);
    })
  );
}
