import { Graph, layout } from "@dagrejs/dagre";
import { Position, type Edge, type Node } from "@xyflow/react";

export const NODE_WIDTH = 280;
export const NODE_HEIGHT = 140;

export function getLayoutedElements<N extends Node>(
  nodes: N[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB",
): { nodes: N[]; edges: Edge[] } {
  const g = new Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 48, ranksep: 96 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  layout(g);

  const horizontal = direction === "LR";
  return {
    edges,
    nodes: nodes.map((n) => {
      const { x, y } = g.node(n.id);
      return {
        ...n,
        // dagre returns node centers; React Flow expects the top-left corner
        position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
        targetPosition: horizontal ? Position.Left : Position.Top,
        sourcePosition: horizontal ? Position.Right : Position.Bottom,
      };
    }),
  };
}
