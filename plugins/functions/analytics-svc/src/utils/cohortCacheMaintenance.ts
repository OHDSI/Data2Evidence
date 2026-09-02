import { Logger } from "@alp/alp-base-utils";
import { CohortType } from "../types.ts";
import { CohortCacheDAO, CohortCacheRow } from "../dao/CohortCacheDAO.ts";
import type { CohortEndpoint } from "../mri/endpoint/CohortEndpoint.ts";
import {
    buildCohortCacheKey,
    buildCohortCacheValue,
    CohortCacheValue,
} from "./cohortCacheKey.ts";

const logger = Logger.CreateLogger("analytics-log");

/**
 * Keeps `analytics.cohort_cache` in step with the three cohort writes that can
 * change what the Cohorts overview shows for a bookmark:
 *
 * - a cohort is materialized  -> `refreshCohortCacheEntry` overwrites the entry
 * - a cohort is deleted       -> `evictCohortCacheEntry` drops it, called
 *                                *before* the delete: the definition row holds
 *                                the only copy of the bookmark id
 * - a cohort is renamed       -> `updateCohortCacheEntryMetadata` rewrites the
 *                                cached name and description in place, keeping
 *                                the count a rename cannot have changed
 *
 * Nothing here throws. A cache write that fails leaves a stale entry, which the
 * TTL expires; it must never fail the cohort write it follows. Likewise a
 * bookmark id that cannot be recovered is left alone rather than escalating to
 * a blunt dataset-wide delete — expiry is cheaper than forcing every bookmark
 * on the dataset to be recomputed.
 */

/** Just the DAO surface this module uses, so tests can supply a fake. */
export interface CohortCacheWriter {
    lookup(keys: string[]): Promise<Map<string, CohortCacheRow>>;
    deleteKey(key: string): Promise<number>;
    upsert(
        entries: { key: string; value: CohortCacheValue }[]
    ): Promise<number>;
}

/**
 * Just the `CohortEndpoint` surface this module uses. Picked from the class
 * rather than redeclared, so editors resolve these calls to the real
 * implementation and a signature change there fails here instead of drifting.
 *
 * `Pick` rather than `CohortEndpoint` itself: the class is structurally typed,
 * so naming it outright would oblige every test double to implement all of it.
 */
export type CohortDefinitionReader = Pick<
    CohortEndpoint,
    "getCohortDefinition" | "queryCohorts"
>;

const asNonEmptyString = (value: unknown): string | null =>
    typeof value === "string" && value.length > 0 ? value : null;

/**
 * Pulls the bookmark id out of a `COHORT_DEFINITION_SYNTAX` blob. Returns null
 * for anything unparseable, or for a cohort that belongs to an Atlas definition
 * rather than a bookmark — neither has a cache entry to act on.
 */
export const readBookmarkIdFromSyntax = (syntax: unknown): string | null => {
    const raw = asNonEmptyString(syntax);
    if (!raw) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw);
        return asNonEmptyString(parsed?.bookmarkId);
    } catch {
        return null;
    }
};

const buildKey = (
    datasetId: unknown,
    paConfigId: unknown,
    bookmarkId: unknown
): string | null => {
    const dataset = asNonEmptyString(datasetId);
    const paConfig = asNonEmptyString(paConfigId);
    const bookmark = asNonEmptyString(bookmarkId);
    if (!dataset || !paConfig || !bookmark) {
        return null;
    }
    return buildCohortCacheKey({
        datasetId: dataset,
        paConfigId: paConfig,
        bookmarkId: bookmark,
    });
};

/**
 * Reads a cohort definition's `syntax`. Never throws. Callers use this before a
 * delete, because the definition row carries the only copy of the bookmark id.
 */
export const readCohortDefinitionSyntax = async (
    cohortEndpoint: CohortDefinitionReader,
    cohortDefinitionId: unknown
): Promise<string | null> => {
    const id =
        cohortDefinitionId === undefined || cohortDefinitionId === null
            ? ""
            : String(cohortDefinitionId);
    if (!id) {
        return null;
    }
    try {
        const result = await cohortEndpoint.getCohortDefinition(id);
        const rows = Array.isArray(result?.data) ? result.data : [];
        const row = rows[0] as Record<string, unknown> | undefined;
        if (!row) {
            return null;
        }
        return asNonEmptyString(row.COHORT_DEFINITION_SYNTAX);
    } catch (err) {
        logger.warn(
            `Could not read cohort definition ${id} for the cohort cache: ${
                err instanceof Error ? err.message : String(err)
            }`
        );
        return null;
    }
};

/**
 * Drops the entry for the bookmark named by `syntax`. Returns true only if a
 * delete was actually issued.
 */
export const evictCohortCacheEntry = async (
    {
        syntax,
        datasetId,
        paConfigId,
    }: { syntax?: unknown; datasetId?: unknown; paConfigId?: unknown },
    dao: CohortCacheWriter = new CohortCacheDAO()
): Promise<boolean> => {
    const key = buildKey(
        datasetId,
        paConfigId,
        readBookmarkIdFromSyntax(syntax)
    );
    if (!key) {
        // Not a bookmark-backed cohort, or the request lacked the ids needed to
        // address the entry. Leave it to the TTL.
        return false;
    }
    try {
        await dao.deleteKey(key);
        return true;
    } catch (err) {
        logger.warn(
            `Cohort cache eviction failed for bookmark entry: ${
                err instanceof Error ? err.message : String(err)
            }`
        );
        return false;
    }
};

/**
 * Overwrites the entry for a bookmark whose cohort has just been materialized.
 *
 * Only `patientCount` actually needs the read — `createCohort` already holds
 * the name, description, timestamp and syntax. But the cache stores
 * `COUNT(DISTINCT SUBJECT_ID)`, and the write path has no such number:
 * `saveCohortToDb` returns an insert row count, and the generated insert
 * `LEFT JOIN`s `OBSERVATION_PERIOD`, so a patient with two observation periods
 * contributes two rows. Reusing it would inflate counts on exactly the datasets
 * with enrollment gaps. The streaming path (`streamCohortToDb`) returns nothing
 * comparable at all.
 *
 * Re-reading with `queryCohorts({ ID })` uses the *same* query that builds
 * cached values on the read path, so the two cannot drift; `excludePatientIds`
 * is set so this never pulls subject ids it would only have to discard.
 */
export const refreshCohortCacheEntry = async (
    {
        cohortEndpoint,
        cohortDefinitionId,
        bookmarkId,
        datasetId,
        paConfigId,
    }: {
        cohortEndpoint: CohortDefinitionReader;
        cohortDefinitionId: unknown;
        bookmarkId?: unknown;
        datasetId?: unknown;
        paConfigId?: unknown;
    },
    dao: CohortCacheWriter = new CohortCacheDAO()
): Promise<boolean> => {
    const key = buildKey(datasetId, paConfigId, bookmarkId);
    if (!key) {
        return false;
    }
    try {
        const [materialized] = await cohortEndpoint.queryCohorts(
            { ID: cohortDefinitionId },
            0,
            1,
            true
        );
        if (!materialized) {
            // The definition should exist — it was just written. Rather than
            // cache a guess, drop any stale entry and let the next read rebuild.
            await dao.deleteKey(key);
            return false;
        }
        await dao.upsert([{ key, value: buildCohortCacheValue(materialized) }]);
        return true;
    } catch (err) {
        logger.warn(
            `Cohort cache refresh failed after materializing cohort ${cohortDefinitionId}: ${
                err instanceof Error ? err.message : String(err)
            }`
        );
        return false;
    }
};

/**
 * Rewrites the definition-derived fields of an already-cached entry after
 * `updateCohortDefinition` — a rename, or an edited description.
 *
 * Deliberately does NOT touch the analytics database. A rename cannot change
 * `patientCount`, so the cached count is carried over and the expensive
 * `COUNT(DISTINCT SUBJECT_ID)` is skipped entirely. That also makes this safe
 * to call without awaiting: it only uses the cache's own short-lived Postgres
 * connection, whereas anything going through `cohortEndpoint` would race
 * `cleanupMiddleware`, which closes `analyticsConnection` inside `res.end`.
 *
 * A cache miss is not an error — the next overview read builds the entry with
 * the new values anyway.
 */
export const updateCohortCacheEntryMetadata = async (
    {
        syntax,
        datasetId,
        paConfigId,
        name,
        description,
    }: {
        syntax?: unknown;
        datasetId?: unknown;
        paConfigId?: unknown;
        name?: unknown;
        description?: unknown;
    },
    dao: CohortCacheWriter = new CohortCacheDAO()
): Promise<boolean> => {
    const key = buildKey(
        datasetId,
        paConfigId,
        readBookmarkIdFromSyntax(syntax)
    );
    if (!key) {
        return false;
    }
    try {
        const existing = (await dao.lookup([key])).get(key);
        const cached = existing?.value.materializedCohort;
        if (!cached) {
            // No entry, or a negative entry — a rename cannot turn one into a
            // positive. Leave it for the next read.
            return false;
        }
        await dao.upsert([
            {
                key,
                value: {
                    materializedCohort: {
                        ...cached,
                        name: typeof name === "string" ? name : cached.name,
                        description:
                            typeof description === "string"
                                ? description
                                : cached.description,
                        // patientCount and creationTimestamp are unchanged by a
                        // definition update, so the cached values stand.
                    },
                },
            },
        ]);
        return true;
    } catch (err) {
        logger.warn(
            `Cohort cache metadata update failed: ${
                err instanceof Error ? err.message : String(err)
            }`
        );
        return false;
    }
};
