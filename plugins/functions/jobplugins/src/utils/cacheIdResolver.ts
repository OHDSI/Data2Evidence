import { PortalServerAPI } from "../api/PortalServerAPI.ts";

/**
 * If a flow-run body carries `datasetId` but no `cacheId`, look up the
 * dataset record and inject `cacheId` (falling back to `databaseCode`).
 *
 * Pass-through controllers that forward an HTTP body straight to a flow
 * may otherwise rely on the client to supply `cacheId`; this lets clients
 * stay oblivious while still routing queries to the right cache catalog.
 *
 * Mutates the input. Best-effort: errors are logged and swallowed so a
 * portal hiccup doesn't fail the flow submission.
 */
export async function ensureOptionsCacheId(body: any, token: string): Promise<void> {
  // Some endpoints wrap fields under `body.options`; others put them at the top level.
  // Resolve against whichever shape the caller used.
  const targets: any[] = [];
  if (body && typeof body === "object") {
    targets.push(body);
    if (body.options && typeof body.options === "object") targets.push(body.options);
  }

  for (const obj of targets) {
    if (obj.cacheId || obj.cache_id) continue;
    const datasetId = obj.datasetId ?? obj.dataset_id;
    if (!datasetId || typeof datasetId !== "string") continue;
    try {
      const dataset = await new PortalServerAPI(token).getDataset(datasetId);
      const resolved = dataset?.cacheId ?? dataset?.databaseCode;
      if (!resolved) continue;
      // Match the casing of the surrounding fields so Pydantic deserialization
      // on the flow side picks it up either way.
      if ("databaseCode" in obj || "datasetId" in obj) obj.cacheId = resolved;
      if ("database_code" in obj || "dataset_id" in obj) obj.cache_id = resolved;
      // If neither casing convention is present, default to camel.
      if (!obj.cacheId && !obj.cache_id) obj.cacheId = resolved;
      return;
    } catch (e) {
      console.warn(`[cacheIdResolver] dataset lookup failed for ${datasetId}: ${(e as Error).message}`);
    }
  }
}
