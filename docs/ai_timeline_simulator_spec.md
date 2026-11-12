# AI Future Timeline Simulator: Design Spec

**Created**: 2026-11-10 14:48 JST  
**Sprint Cycle**: 14 Days (Stage 1 to Stage 3)  
**Workflow**: built with OpenCode. The rules and skills mentioned here (`ponytail`, `grilling`, `context7`, `ui-ux-pro-max`) live in [CloudStriker/dotfiles](https://github.com/CloudStriker/dotfiles/).

---

> This is the original design contract, written before implementation. The game mechanics (energy, guesses, endings), on-demand reasoning and evidence were added later and are described in the README.

## 1. Project Overview & Architectural Contract

The **AI Future Timeline Simulator** is an interactive web application that visualizes branching future scenarios from a user-defined "What If?" prompt using a hierarchical graph canvas.

### Design Decisions (Settled via Grilling)
1. **Topology**: Strict Tree (1 parent per node, no DAG/convergence) to ensure deterministic layout calculations and prevent circular dependencies.
2. **Context Window Strategy**: When expanding a node, send only the linear lineage path from the root node to the selected node (`Root -> Node A -> Node B`).
3. **Layout Engine**: `@dagrejs/dagre` for automated node position calculation to prevent overlapping.
4. **State & Storage**: Client-side state managed via React hooks; persistence via `localStorage` (zero-auth MVP).
5. **UI & Theme**: Dark mode minimalist sci-fi theme complying with `ui-ux-pro-max` (no generic purple/pink AI gradients).

---

## 2. Directory Structure

```text
src/
├── app/
│   ├── api/
│   │   └── timeline/
│   │       └── branch/
│   │           └── route.ts        # Structured LLM JSON handler
│   ├── layout.tsx
│   ├── page.tsx                    # Main canvas layout & drawer integration
│   └── globals.css
├── components/
│   ├── canvas/
│   │   ├── TimelineCanvas.tsx      # React Flow wrapper, viewport & controls
│   │   └── TimelineNode.tsx        # Custom node component with category styling
│   └── panels/
│       ├── ScenarioInput.tsx       # Root scenario input & preset chips
│       └── NodeDetailDrawer.tsx    # Node inspection & "Expand Branch" trigger
├── lib/
│   ├── dagre-layout.ts             # Dagre hierarchical layout helper
│   └── storage.ts                  # LocalStorage serialization & recovery
└── types/
    └── timeline.ts                 # Core TypeScript definitions
```

---

## 3. Core TypeScript Interface (`src/types/timeline.ts`)

```typescript
export type NodeCategory = "optimistic" | "dystopian" | "wildcard";

export interface TimelineNodeData {
  id: string;
  parentId: string | null;
  yearOffset: number; // e.g., +2 (2028), +5 (2031)
  title: string;      // Max 5-7 words
  summary: string;    // 1-2 concise sentences
  category: NodeCategory;
  probability: number; // Integer between 1 and 100
  keyDriver: string;  // Primary driving factor (e.g., "Policy Shift", "Breakthrough")
  isRoot?: boolean;
}

export interface GenerateBranchPayload {
  scenario: string;
  pathHistory: TimelineNodeData[];
}

export interface GenerateBranchResponse {
  branches: TimelineNodeData[];
}
```

---

## 4. Quality & Verification Checklist

- [ ] **Ponytail Check**: Zero unused wrappers or speculative interfaces.
- [ ] **Documentation Check**: `@xyflow/react` and `@dagrejs/dagre` queried via `context7`.
- [ ] **UI-UX Check**: Accessible color contrast, no generic AI gradients, clean mobile-responsive drawer.
- [ ] **Safety Check**: Input validation on API route and error boundaries around canvas rendering.
