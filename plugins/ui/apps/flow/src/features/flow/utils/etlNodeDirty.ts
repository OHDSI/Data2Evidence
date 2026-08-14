import isEqual from "lodash.isequal";

/**
 * The two ETL nodes covered by OHDSI/Data2Evidence#1162. Only these are
 * compared, so moving a node or editing an unrelated node does not raise the
 * ETL unsaved-changes warning.
 */
export const ETL_NODE_TYPES = new Set([
  "white_rabbit_node",
  "rabbit_in_a_hat",
]);

export interface ComparableNode {
  id: string;
  type?: string;
  data?: unknown;
}

export type EtlNodeDataMap = Record<string, unknown>;

export function collectEtlNodeData(
  nodes: ComparableNode[] | undefined
): EtlNodeDataMap {
  const collected: EtlNodeDataMap = {};
  if (!nodes) return collected;

  for (const node of nodes) {
    if (node.type && ETL_NODE_TYPES.has(node.type)) {
      collected[node.id] = node.data;
    }
  }
  return collected;
}

/**
 * True when live ETL node configuration differs from the saved revision.
 *
 * Comparing against the saved revision (rather than tracking edit events)
 * means the answer self-corrects: it goes clean after a save, after a revision
 * restore, and if the user manually reverts an edit.
 *
 * `savedNodes` is undefined while the revision query is still in flight. There
 * is nothing to lose in that window, so report clean rather than blocking
 * navigation on incomplete information.
 */
export function isEtlDirty(
  liveNodes: ComparableNode[] | undefined,
  savedNodes: ComparableNode[] | undefined
): boolean {
  if (!savedNodes) return false;

  return !isEqual(collectEtlNodeData(liveNodes), collectEtlNodeData(savedNodes));
}
