import { MigrationInterface, QueryRunner } from "npm:typeorm";

/**
 * Issue #2877 — non-HANA datasets of type 'source' were assigned
 * cache_id = sanitizeIdForCacheId(id), naming a DuckDB catalog that is never built
 * (cache files are only built for WebAPI-managed datasets; a source row's cache lives
 * on its child cache dataset). Because consumers resolve `cacheId ?? databaseCode`,
 * that non-null-but-invalid value suppressed the databaseCode fallback and queries
 * hit a missing catalog.
 *
 * Repairs rows created between AddDatasetCacheId1778417559068 and the resolveCacheId fix.
 * HANA rows are untouched — they already used database_code and remain correct.
 */
export class FixSourceDatasetCacheId1778417559069
  implements MigrationInterface
{
  name = "FixSourceDatasetCacheId1778417559069";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "portal"."dataset"
      SET "cache_id" = "database_code"
      WHERE "type" = 'source'
        AND "dialect" <> 'hana'
        AND "database_code" IS NOT NULL
        AND "cache_id" IS DISTINCT FROM "database_code"
    `);
  }

  public async down(): Promise<void> {
    // Non-reversible by design: the pre-migration cache_id named a catalog that was never
    // created, so restoring it would only reintroduce the broken reference.
  }
}
