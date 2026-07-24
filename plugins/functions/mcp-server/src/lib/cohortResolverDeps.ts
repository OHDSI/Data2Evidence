import type { ResolverDeps } from "./cohortResolver";
import { AnalyticsAPI } from "../api/AnalyticsAPI";

/**
 * Build the live ResolverDeps from the service clients. The only remaining I/O
 * is category/text value resolution via the analytics-svc `values` endpoint
 * (fuzzy pick of the dataset's coded value). Concept sets are NOT resolved here:
 * the agent resolves them to ids up front (search_concepts → concept-set tools)
 * and the resolver passes those ids through, so this stays minimal and the
 * resolver stays pure/testable.
 */
export interface DepsContext {
  authorization: string;
  datasetId: string;
  configId: string;
  configVersion: string;
}

export function buildResolverDeps(
  analyticsApi: AnalyticsAPI,
  ctx: DepsContext,
): ResolverDeps {
  return {
    resolveValue: async (_card, attr, raw) => {
      const values = await analyticsApi.getAttributeValues(
        ctx.authorization,
        ctx.datasetId,
        attr.configPath,
        ctx.configId,
        ctx.configVersion,
        raw,
      );
      if (values.length === 0) {
        throw new Error(`No value for "${attr.name}" matching "${raw}".`);
      }
      const n = raw.trim().toLowerCase();
      const exact = values.find(
        (v) => v.label.toLowerCase() === n || v.value.toLowerCase() === n,
      );
      return (exact ?? values[0]).value;
    },
  };
}
