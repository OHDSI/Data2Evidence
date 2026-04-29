import { Node } from "reactflow";

/**
 * Returns true if another node (excluding `currentNodeId`) already uses `name`.
 * Exact-match comparison only; case-sensitive, whitespace-sensitive.
 */
export const isDuplicateNodeName = (
  nodes: Node[],
  currentNodeId: string,
  name: string
): boolean =>
  nodes.some(
    (node) => node.id !== currentNodeId && node.data?.name === name
  );
