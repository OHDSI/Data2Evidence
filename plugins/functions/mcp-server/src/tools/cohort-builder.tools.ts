import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AnalyticsAPI } from "../api/AnalyticsAPI";
import { buildDeepLinkUrl } from "../lib/cohortBuilder";
import { buildCohortCatalog, summarizeCatalog } from "../lib/cohortCatalog";
import { resolveClausesToConstraints } from "../lib/cohortResolver";
import { buildCohortBookmarkTree } from "../lib/cohortBookmarkTree";
import { buildResolverDeps } from "../lib/cohortResolverDeps";
import type { CohortClause } from "../lib/cohortClause";
import {
  requireAuthAndDataset,
  createStructuredResponse,
  createTextResponse,
} from "../utils/request-helpers";

const analyticsApi = new AnalyticsAPI();

/**
 * Register the D2E Patient Analytics cohort deep-link builder tool.
 *
 * Turns a compact { ageMin?, ageMax?, gender? } spec into a PA cohort builder
 * deep link. The LLM extracts intent; this tool deterministically serialises
 * the rule-bound bookmark tree (a wrong tree silently loads the wrong cohort).
 * POC scope: Basic Data age + gender only.
 */
export function registerCohortBuilderTools(server: McpServer) {
  // Discovery tool: the catalog of filter cards + attributes available on THIS
  // dataset, derived from the live PA config. The agent calls this first to
  // ground its filter choices on real cards/attributes (rather than guessing
  // configPaths, which is how a bookmark ends up referencing an attribute the
  // dataset doesn't have).
  server.registerTool(
    "list_cohort_filters",
    {
      title: "List Cohort Filter Options",
      description:
        "List the filter cards and attributes available for building a cohort " +
        "on the CURRENT dataset. Call this BEFORE build_d2e_cohort_deeplink to " +
        "discover which cards exist (e.g. Basic Data, Condition Occurrence, " +
        "Measurement) and each attribute's kind: 'num' (numeric / range), " +
        "'category' (coded value resolved by name), 'conceptSet' (clinical " +
        "concept set / phenotype) or 'datetime'. Only reference cards and " +
        "attributes returned here.",
      inputSchema: {},
      // No outputSchema on purpose: the MCP adapter then hands the model the
      // clean text summary (card -> attribute[kind]) instead of a 142-item JSON
      // blob, which the model can actually read and act on.
    },
    async (_args, { requestInfo }) => {
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);
      const fe = await analyticsApi.getFrontendConfig(authorization, datasetId);
      if (!fe) {
        throw new Error(`No Patient Analytics config for dataset ${datasetId}.`);
      }
      const catalog = buildCohortCatalog(fe.config);
      const attrCount = catalog.cards.reduce(
        (n, c) => n + c.attributes.length,
        0,
      );
      console.log(
        `[cohort-builder] list_cohort_filters: dataset=${datasetId} ` +
          `cards=${catalog.cards.length} attributes=${attrCount}`,
      );
      return createTextResponse(summarizeCatalog(catalog));
    },
  );

  server.registerTool(
    "build_d2e_cohort_deeplink",
    {
      title: "Build D2E Cohort Deep Link",
      description:
        "Build a Patient Analytics cohort builder deep link from a list of " +
        "filter clauses. First call list_cohort_filters to learn the cards and " +
        "attributes, and resolve any clinical concept to a concept-set id " +
        "(search_concepts / phenotype library → check_concept_coverage_in_dataset " +
        "→ create_concept_set). Each clause targets ONE card: `card` is a card " +
        "name; `conceptSetId` attaches a concept set to an event card; " +
        "`constraints` are {attribute, op, value} on that card's attributes " +
        "(op: >=,<=,<,>,=,!=,range; value number/string, or [low,high] for range); " +
        "`exclude:true` negates the card. Returns a URL that opens the PA cohort " +
        "builder pre-filled.",
      inputSchema: {
        clauses: z
          .array(
            z.object({
              card: z.string().describe("Filter card name from list_cohort_filters."),
              exclude: z.boolean().optional()
                .describe("Negate this card (exclude matching patients)."),
              conceptSetId: z.number().int().optional()
                .describe("Concept-set id for an event card (agent-resolved)."),
              constraints: z
                .array(
                  z.object({
                    attribute: z.string(),
                    op: z.string(),
                    value: z.union([
                      z.number(),
                      z.string(),
                      z.array(z.union([z.number(), z.string()])),
                    ]),
                  }),
                )
                .optional(),
            }),
          )
          .describe("One clause per filter card occurrence."),
      },
      outputSchema: {
        url: z.string(),
        warning: z.string().optional(),
      },
    },
    async ({ clauses }, { requestInfo }) => {
      const toolStart = performance.now();
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);
      console.log(
        `[cohort-builder] START datasetId=${datasetId} clauses=${JSON.stringify(clauses)}`,
      );

      // 1. Fetch the frontend config: the catalog (cards/attributes) + the
      //    config stamp the bookmark must carry, from the same getMyConfig.
      const fe = await analyticsApi.getFrontendConfig(authorization, datasetId);
      if (!fe) {
        console.error(`[cohort-builder] no PA config for dataset ${datasetId}`);
        throw new Error(`No Patient Analytics config for dataset ${datasetId}.`);
      }
      const catalog = buildCohortCatalog(fe.config);

      // 2. Resolve clauses -> constraints. num/range are pure; category values
      //    hit the analytics values endpoint; conceptSetId passes through.
      //    Throws an LLM-actionable error on any unresolved clause.
      const deps = buildResolverDeps(analyticsApi, {
        authorization,
        datasetId,
        configId: fe.meta.configId,
        configVersion: fe.meta.configVersion,
      });
      const constraints = await resolveClausesToConstraints(
        clauses as CohortClause[],
        catalog,
        deps,
      );

      // 3. Serialize the bookmark tree (+ NOT for exclusions) and assemble the link.
      const bookmark = buildCohortBookmarkTree(constraints, fe.meta);
      console.log(
        `[cohort-builder] resolved constraints=${JSON.stringify(constraints)}`,
      );
      console.log(`[cohort-builder] bookmark=${JSON.stringify(bookmark)}`);
      const { url, tooLong } = buildDeepLinkUrl(bookmark, datasetId);
      const warning = tooLong
        ? "The generated link is unusually long and may not work in all browsers."
        : undefined;

      console.log(
        `[MCP-TIMING] [build_d2e_cohort_deeplink] END total=${(performance.now() - toolStart).toFixed(1)}ms len=${url.length}`,
      );

      // Return ONLY the URL as the tool text; the /cohort endpoint appends it
      // deterministically so the model never relays the long, mangle-prone link.
      return createStructuredResponse(url, warning ? { url, warning } : { url });
    },
  );
}
