import type { ResolverDeps } from "./cohortResolver";
import { AnalyticsAPI } from "../api/AnalyticsAPI";
import { TerminologyAPI } from "../api/TerminologyAPI";

/**
 * Build the live ResolverDeps from the service clients. This is the edge where
 * the resolver's injected lookups become real I/O:
 *  - category/text values via analytics-svc `values` endpoint (fuzzy pick);
 *  - concept sets via the terminology service (reuse-or-create).
 * Kept separate from the resolver so the resolver stays pure/testable.
 */
export interface DepsContext {
  authorization: string;
  datasetId: string;
  configId: string;
  configVersion: string;
  /** Vocabulary source key for seed concept search (dataset-specific). */
  sourceKey: string;
  /** Timestamp for naming auto-created concept sets (passed in for determinism). */
  now: number;
}

export function buildResolverDeps(
  analyticsApi: AnalyticsAPI,
  terminologyApi: TerminologyAPI,
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
    resolveConceptSet: (card, _attr, conceptText) =>
      terminologyApi.resolveConceptSetId(
        ctx.authorization,
        ctx.datasetId,
        card.key,
        conceptText,
        ctx.sourceKey,
        ctx.now,
      ),
  };
}
