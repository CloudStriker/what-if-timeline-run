export type NodeCategory = "optimistic" | "dystopian" | "wildcard";

// One reason a branch's probability is higher or lower. AI reasoning, not a verified fact.
export interface Factor {
  effect: "raises" | "lowers";
  note: string;
}

// A web page related to a node's reasoning; the summary is the AI's paraphrase, not a verified quote.
export interface Source {
  title: string;
  url: string; // always https
  summary: string;
}

export interface TimelineNodeData {
  id: string;
  parentId: string | null;
  yearOffset: number; // e.g., +2 (2028), +5 (2031)
  title: string; // Max 5-7 words
  summary: string; // 1-2 concise sentences
  category: NodeCategory;
  probability: number; // Integer between 1 and 100
  keyDriver: string; // Primary driving factor (e.g., "Policy Shift", "Breakthrough")
  isRoot?: boolean;
  rationale?: string; // 1-2 sentences on why the probability is what it is
  factors?: Factor[]; // optional: nodes saved before this field existed have none
  sources?: Source[]; // filled on demand by "Find evidence"
}

export interface GenerateBranchPayload {
  scenario: string;
  pathHistory: TimelineNodeData[];
}

export interface GenerateBranchResponse {
  branches: TimelineNodeData[];
}

// Result of a "which future will the AI rate most likely?" guess, stored per expanded node id.
export interface Guess {
  pick: NodeCategory;
  rank: 1 | 2 | 3; // 1 = the pick had the highest probability
  points: number;
}

// Job routes stream newline-delimited JSON events while the agent works.
export type StreamEvent<R> =
  | { type: "status"; text: string }
  | ({ type: "result" } & R)
  | { type: "error"; error: string };

// Longest allowed root-to-node path sent to the LLM; caps tree depth and quota use.
export const MAX_PATH_LENGTH = 4;
