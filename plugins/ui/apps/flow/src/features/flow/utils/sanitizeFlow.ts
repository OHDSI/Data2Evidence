import { EdgeState, NodeState } from "../types";

const FALLBACK_GRID_GAP_X = 400;
const FALLBACK_GRID_GAP_Y = 250;
const FALLBACK_ORIGIN_X = 100;
const FALLBACK_ORIGIN_Y = 100;
const FALLBACK_COLUMNS = 5;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const hasValidPosition = (node: NodeState): boolean =>
  !!node.position &&
  isFiniteNumber(node.position.x) &&
  isFiniteNumber(node.position.y);

const fallbackPosition = (index: number) => ({
  x: FALLBACK_ORIGIN_X + (index % FALLBACK_COLUMNS) * FALLBACK_GRID_GAP_X,
  y:
    FALLBACK_ORIGIN_Y +
    Math.floor(index / FALLBACK_COLUMNS) * FALLBACK_GRID_GAP_Y,
});

export const sanitizeFlowNodes = (nodes: unknown): NodeState[] => {
  if (!Array.isArray(nodes)) return [];
  const renderable = nodes.filter(
    (node): node is NodeState =>
      !!node &&
      typeof node === "object" &&
      typeof (node as NodeState).id === "string" &&
      !!(node as NodeState).id &&
      typeof (node as NodeState).type === "string"
  );
  return renderable.map((node, index) =>
    hasValidPosition(node)
      ? node
      : { ...node, position: fallbackPosition(index) }
  );
};

export const sanitizeFlowEdges = (
  edges: unknown,
  nodes: NodeState[]
): EdgeState[] => {
  if (!Array.isArray(edges)) return [];
  const nodeIds = new Set(nodes.map((n) => n.id));
  return edges.filter(
    (edge): edge is EdgeState =>
      !!edge &&
      typeof edge === "object" &&
      typeof (edge as EdgeState).id === "string" &&
      nodeIds.has((edge as EdgeState).source) &&
      nodeIds.has((edge as EdgeState).target)
  );
};
