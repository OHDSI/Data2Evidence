const STORAGE_KEY_PREFIX = "d2e_mapping_app";

/**
 * Scopes the mapping draft cache to a single ETL node. Previously every node
 * shared one constant key, so two Rabbit in a Hat nodes on one canvas
 * overwrote each other (OHDSI/Data2Evidence#1162).
 *
 * This cache is a same-tab convenience only — the saved flow revision is
 * authoritative.
 */
export function mappingStorageKey(nodeId: string | undefined) {
  return `${STORAGE_KEY_PREFIX}:${nodeId || "standalone"}`;
}
