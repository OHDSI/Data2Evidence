export type DatabaseConfig = {
  host: string;
  port: number;
  user: string;
  database: string;
};

export interface Dataset {
  id: string;
  dialect: string;
  schemaName: string;
  /**
   * Persisted cache catalog alias (portal.dataset.cache_id). Authoritative for
   * opening trex connections; nullable on records the backfill left unset.
   */
  cacheId?: string | null;
  databaseCode?: string | null;
}
