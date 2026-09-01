import { Response } from "express";
import { Logger } from "@alp/alp-base-utils";
import { IMRIRequest } from "../../types.ts";
import MRIEndpointErrorHandler from "../../utils/MRIEndpointErrorHandler.ts";
import {
    CohortCacheDAO,
    CohortCacheUpsertEntry,
} from "../../dao/CohortCacheDAO.ts";
import {
    buildCohortCacheKey,
    buildCohortCacheValue,
    CohortCacheValue,
} from "../../utils/cohortCacheKey.ts";

const logger = Logger.CreateLogger("analytics-log");
const language = "en";

const toBookmarkIdList = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }
    const seen = new Set<string>();
    for (const candidate of value) {
        if (typeof candidate === "string" && candidate.length > 0) {
            seen.add(candidate);
        }
    }
    return [...seen];
};

/**
 * POST /analytics-svc/api/services/cohort-cache/lookup
 *
 * body:     { datasetId, bookmarkIds: [...] }
 * response: { entries: { <bookmarkId>: { materializedCohort } }, missing: [...] }
 *
 * A bookmark id under `entries` is a HIT, including when its
 * `materializedCohort` is `null` — that negative entry is the whole point of
 * the cache. Only ids with no row at all go under `missing`.
 */
export async function lookupCohortCache(req: IMRIRequest, res: Response) {
    try {
        const body = req.body ?? {};
        const datasetId =
            typeof body.datasetId === "string" ? body.datasetId : "";
        const bookmarkIds = toBookmarkIdList(body.bookmarkIds);

        if (!datasetId) {
            return res.status(400).json({ message: "datasetId is required" });
        }

        // paConfigId is always derived server-side, never taken from the body.
        // Without it there is no key to look up, and silently reporting every
        // bookmark as missing would hide a broken PA config behind what looks
        // like a cold cache. Fail loudly instead; the caller falls back to the
        // uncached path either way, but the failure is visible.
        const paConfigId = req.paConfigId;
        if (!paConfigId) {
            throw new Error(
                `Could not resolve paConfigId for dataset ${datasetId}; cohort cache lookup cannot build a key`
            );
        }

        if (bookmarkIds.length === 0) {
            return res.status(200).json({ entries: {}, missing: [] });
        }

        const keyByBookmarkId = new Map<string, string>();
        for (const bookmarkId of bookmarkIds) {
            keyByBookmarkId.set(
                bookmarkId,
                buildCohortCacheKey({ datasetId, paConfigId, bookmarkId })
            );
        }

        const rows = await new CohortCacheDAO().lookup([
            ...keyByBookmarkId.values(),
        ]);

        const entries: Record<string, CohortCacheValue> = {};
        const missing: string[] = [];
        for (const [bookmarkId, key] of keyByBookmarkId) {
            const value = rows.get(key);
            if (value) {
                // Present, whatever `materializedCohort` holds: a hit.
                entries[bookmarkId] = value;
            } else {
                missing.push(bookmarkId);
            }
        }

        return res.status(200).json({ entries, missing });
    } catch (err) {
        logger.error(err);
        return res
            .status(500)
            .send(MRIEndpointErrorHandler({ err, language }));
    }
}

/**
 * PUT /analytics-svc/api/services/cohort-cache
 *
 * body:     { datasetId, entries: [ { bookmarkId, materializedCohort } ] }
 * response: 204
 */
export async function upsertCohortCache(req: IMRIRequest, res: Response) {
    try {
        const body = req.body ?? {};
        const datasetId =
            typeof body.datasetId === "string" ? body.datasetId : "";
        const incomingEntries = Array.isArray(body.entries) ? body.entries : [];

        if (!datasetId) {
            return res.status(400).json({ message: "datasetId is required" });
        }

        // Same as the lookup path: without a server-derived paConfigId there is
        // no key to write under. Accepting and discarding would report success
        // for a write that never happened.
        const paConfigId = req.paConfigId;
        if (!paConfigId) {
            throw new Error(
                `Could not resolve paConfigId for dataset ${datasetId}; refusing to write ${incomingEntries.length} cohort cache entries`
            );
        }

        const upsertEntries: CohortCacheUpsertEntry[] = [];
        for (const entry of incomingEntries) {
            const bookmarkId = entry?.bookmarkId;
            if (typeof bookmarkId !== "string" || bookmarkId.length === 0) {
                continue;
            }
            upsertEntries.push({
                key: buildCohortCacheKey({
                    datasetId,
                    paConfigId,
                    bookmarkId,
                }),
                value: buildCohortCacheValue(entry.materializedCohort),
            });
        }

        if (upsertEntries.length > 0) {
            await new CohortCacheDAO().upsert(upsertEntries);
        }

        return res.sendStatus(204);
    } catch (err) {
        logger.error(err);
        return res
            .status(500)
            .send(MRIEndpointErrorHandler({ err, language }));
    }
}
