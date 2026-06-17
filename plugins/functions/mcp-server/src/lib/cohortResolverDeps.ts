import type { ResolverDeps } from "./cohortResolver";
import { AnalyticsAPI } from "../api/AnalyticsAPI";
import { TerminologyAPI } from "../api/TerminologyAPI";

/**
 * Build the live ResolverDeps from the service clients. The remaining I/O is
 * category/text value resolution via the analytics-svc `values` endpoint (fuzzy
 * pick of the dataset's coded value) and concept-set existence validation via
 * terminology-svc (so a raw OMOP concept id / phenotype id can't masquerade as a
 * concept-set id). The agent still resolves concept sets to ids up front; the
 * resolver only verifies those ids are real, keeping it pure/testable.
 */
export interface DepsContext {
  authorization: string;
  datasetId: string;
  configId: string;
  configVersion: string;
}

export function buildResolverDeps(
  analyticsApi: AnalyticsAPI,
  terminologyApi: TerminologyAPI,
  ctx: DepsContext,
): ResolverDeps {
  // Fetch the dataset's concept-set ids once and reuse across all clauses in a
  // single resolve pass (a cohort can reference the same set in several cards).
  let conceptSetIds: Promise<Set<number>> | null = null;
  const loadConceptSetIds = (): Promise<Set<number>> => {
    if (!conceptSetIds) {
      conceptSetIds = terminologyApi
        .listConceptSets(ctx.authorization, ctx.datasetId)
        .then((sets) => new Set(sets.map((s) => Number(s.id))));
    }
    return conceptSetIds;
  };

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
    conceptSetExists: async (id) => {
      const ids = await loadConceptSetIds();
      return ids.has(Number(id));
    },
  };
}
