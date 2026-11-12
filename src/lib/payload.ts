import { hasContentFields, isObj, isStr } from "@/lib/validate";
import { MAX_PATH_LENGTH, type GenerateBranchPayload, type TimelineNodeData } from "@/types/timeline";

// Validates {scenario, pathHistory}: a root-to-node lineage, which is the only context the LLM gets.
export function parsePathPayload(body: unknown): GenerateBranchPayload | null {
  if (!isObj(body) || !isStr(body.scenario, 300)) return null;
  const path = body.pathHistory;
  if (!Array.isArray(path) || path.length < 1 || path.length > MAX_PATH_LENGTH) return null;

  for (let i = 0; i < path.length; i++) {
    const n = path[i];
    if (!isObj(n) || !isStr(n.id, 64) || !hasContentFields(n)) return null;
    // strict tree: root has no parent, every other node points at the previous one
    const expectedParent = i === 0 ? null : (path[i - 1] as TimelineNodeData).id;
    if (n.parentId !== expectedParent) return null;
  }
  return { scenario: body.scenario, pathHistory: path as TimelineNodeData[] };
}
