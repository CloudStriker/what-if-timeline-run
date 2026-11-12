import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

// Default bezier edge plus, on the path to the selected node, light dots flowing parent -> child.
export function TimelineEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, data }: EdgeProps) {
  const [path] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const active = (data as { active?: boolean } | undefined)?.active;

  return (
    <>
      <BaseEdge id={id} path={path} style={style} />
      {active && <path d={path} fill="none" className="edge-energy" aria-hidden />}
    </>
  );
}
