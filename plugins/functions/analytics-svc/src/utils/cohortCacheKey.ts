import { CohortType } from "../types.ts";

/**
 * Owns the `analytics.cohort_cache` key format and value shapes so that the
 * read, write and invalidation paths cannot disagree about either.
 *
 *     <datasetId>|<paConfigId>|<bookmarkId>
 *
 * Every segment is URL-escaped, so no segment can inject the `|` delimiter.
 * `datasetId` comes first so the dataset-wide prefix delete rides the primary
 * key. `paConfigId` is always derived server-side from `req.paConfigId`, never
 * taken from the caller.
 *
 * There is no version segment. If the stored value shape ever changes
 * incompatibly, clear the table rather than relying on a key prefix to retire
 * old rows.
 */

export const COHORT_CACHE_KEY_DELIMITER = "|";

export type CohortCacheKeyParts = {
    datasetId: string;
    paConfigId: string;
    bookmarkId: string;
};

/**
 * The cached form of a materialized cohort. This is analytics-svc's
 * `CohortType` minus `patientIds`, which is never stored: the overview call
 * always sets `excludePatientIds=true`, and the cache must not hold subject
 * identifiers.
 */
export type CachedMaterializedCohort = Omit<CohortType, "patientIds">;

/**
 * The stored JSON value. `materializedCohort: null` is a negative entry: the
 * bookmark has no materialized cohort on this dataset. A negative entry is a
 * cache HIT, not a miss.
 */
export type CohortCacheValue = {
    materializedCohort: CachedMaterializedCohort | null;
};

const encodeSegment = (segment: string): string =>
    encodeURIComponent(segment ?? "");

const decodeSegment = (segment: string): string => decodeURIComponent(segment);

const requireSegment = (name: string, value: string): string => {
    if (typeof value !== "string" || value.length === 0) {
        throw new Error(`Cohort cache key segment "${name}" is required`);
    }
    return value;
};

/**
 * Builds the cache key for one bookmark on one dataset.
 */
export const buildCohortCacheKey = ({
    datasetId,
    paConfigId,
    bookmarkId,
}: CohortCacheKeyParts): string =>
    [
        encodeSegment(requireSegment("datasetId", datasetId)),
        encodeSegment(requireSegment("paConfigId", paConfigId)),
        encodeSegment(requireSegment("bookmarkId", bookmarkId)),
    ].join(COHORT_CACHE_KEY_DELIMITER);

/**
 * Inverse of `buildCohortCacheKey`. Returns `null` for anything that does not
 * have the expected shape.
 */
export const parseCohortCacheKey = (key: string): CohortCacheKeyParts | null => {
    if (typeof key !== "string") {
        return null;
    }
    const segments = key.split(COHORT_CACHE_KEY_DELIMITER);
    if (segments.length !== 3) {
        return null;
    }
    try {
        return {
            datasetId: decodeSegment(segments[0]),
            paConfigId: decodeSegment(segments[1]),
            bookmarkId: decodeSegment(segments[2]),
        };
    } catch {
        // Malformed percent-escapes: not a key this module wrote.
        return null;
    }
};

/**
 * `<datasetId>|` — the prefix every key for one dataset shares, used by the
 * dataset-wide invalidation delete.
 */
export const buildCohortCacheDatasetPrefix = (datasetId: string): string =>
    `${encodeSegment(
        requireSegment("datasetId", datasetId)
    )}${COHORT_CACHE_KEY_DELIMITER}`;

/**
 * Normalises a cohort into the stored value shape, dropping `patientIds`.
 */
export const buildCohortCacheValue = (
    materializedCohort: CohortType | null | undefined
): CohortCacheValue => {
    if (!materializedCohort) {
        return { materializedCohort: null };
    }
    const { patientIds: _patientIds, ...rest } = materializedCohort;
    return { materializedCohort: rest };
};

/**
 * Guards a value read back out of Postgres. A row whose JSON does not carry a
 * `materializedCohort` property is treated as absent rather than as a
 * negative entry.
 */
export const isCohortCacheValue = (
    value: unknown
): value is CohortCacheValue =>
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "materializedCohort" in (value as Record<string, unknown>);
