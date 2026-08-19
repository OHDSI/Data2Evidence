interface CacheTargetDataset {
  cacheId?: string | null;
  databaseCode?: string | null;
}

/**
 * Resolves the DuckDB catalog a datamart cache file is WRITTEN to.
 *
 * The cache-file flow writes to `options.cache_id or options.database_code`
 * (create_cachedb_file_plugin/flow.py) and names the .duckdb file after it, so this value
 * decides where the built cache actually lands.
 *
 * It must come from the *cache* dataset, not the source dataset. Since issue #2877 a
 * `source` row's cache_id is its databaseCode — the source is queried straight against its
 * database — so using the source row here would name the cache file after the source
 * connection's own trex alias, and the cache dataset (which carries its own per-dataset
 * catalog) would point at a catalog nobody ever wrote.
 *
 * Falls back to the source-derived value when there is no cache dataset, or when a legacy
 * cache dataset row still has a null cache_id.
 */
export function resolveCacheWriteTarget(
  sourceDataset: CacheTargetDataset,
  cacheDataset?: CacheTargetDataset | null,
): string | undefined {
  const sourceTarget =
    sourceDataset?.cacheId ?? sourceDataset?.databaseCode ?? undefined;
  return cacheDataset?.cacheId ?? sourceTarget;
}
