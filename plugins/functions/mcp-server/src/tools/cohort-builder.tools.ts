import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AnalyticsAPI } from "../api/AnalyticsAPI";
import {
  buildCohortBookmark,
  buildDeepLinkUrl,
  validateCohortSpec,
} from "../lib/cohortBuilder";
import { buildCohortCatalog, summarizeCatalog } from "../lib/cohortCatalog";
import {
  requireAuthAndDataset,
  createStructuredResponse,
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
      outputSchema: {
        cards: z.array(
          z.object({
            key: z.string(),
            configPath: z.string(),
            name: z.string(),
            attributes: z.array(
              z.object({
                key: z.string(),
                configPath: z.string(),
                name: z.string(),
                type: z.string(),
                kind: z.string(),
              }),
            ),
          }),
        ),
      },
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
      return createStructuredResponse(summarizeCatalog(catalog), catalog);
    },
  );

  server.registerTool(
    "build_d2e_cohort_deeplink",
    {
      title: "Build D2E Cohort Deep Link",
      description:
        "Build a Patient Analytics cohort builder deep link from an age range " +
        "and/or gender. Supports ONLY age (ageMin/ageMax) and gender " +
        "(FEMALE or MALE) for now. Returns a URL that opens the PA cohort " +
        "builder with the filter card pre-filled. Provide at least an age " +
        "bound or a gender.",
      inputSchema: {
        ageMin: z.number().int().nonnegative().optional()
          .describe("Inclusive minimum age, e.g. 60 for 'over 60' use 60."),
        ageMax: z.number().int().nonnegative().optional()
          .describe("Inclusive maximum age."),
        gender: z.string().optional()
          .describe("Patient gender: FEMALE or MALE."),
      },
      outputSchema: {
        url: z.string(),
        warning: z.string().optional(),
      },
    },
    async ({ ageMin, ageMax, gender }, { requestInfo }) => {
      const toolStart = performance.now();
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);
      console.log(
        `[cohort-builder] START datasetId=${datasetId} spec=${JSON.stringify({ ageMin, ageMax, gender })}`,
      );

      // 1. Validate + normalise. Errors are LLM-actionable text the agent relays.
      const validated = validateCohortSpec({ ageMin, ageMax, gender });
      if ("error" in validated) {
        console.warn(`[cohort-builder] validation failed: ${validated.error}`);
        throw new Error(validated.error);
      }

      // 2. Fetch the PA config stamp for this dataset.
      const config = await analyticsApi.getConfigStamp(authorization, datasetId);
      if (!config) {
        console.error(`[cohort-builder] no PA config for dataset ${datasetId}`);
        throw new Error(`No Patient Analytics config for dataset ${datasetId}.`);
      }
      console.log(
        `[cohort-builder] config stamp configId=${config.configId} configVersion=${config.configVersion}`,
      );

      // 3. Build the bookmark tree and assemble the deep link.
      const bookmark = buildCohortBookmark(validated.spec, config);
      const { url, tooLong } = buildDeepLinkUrl(bookmark, datasetId);

      const warning = tooLong
        ? "The generated link is unusually long and may not work in all browsers."
        : undefined;

      console.log(
        `[MCP-TIMING] [build_d2e_cohort_deeplink] END total=${(performance.now() - toolStart).toFixed(1)}ms len=${url.length}`,
      );

      // Return ONLY the URL as the tool text. The /cohort endpoint captures it
      // and appends it to the reply deterministically, so the model never has
      // to relay the long, easily-mangled link. structuredContent carries it
      // (plus any warning) for clients that read structured output.
      return createStructuredResponse(
        url,
        warning ? { url, warning } : { url },
      );
    },
  );
}
