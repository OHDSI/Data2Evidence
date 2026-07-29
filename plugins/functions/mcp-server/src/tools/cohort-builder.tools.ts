import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AnalyticsAPI } from "../api/AnalyticsAPI";
import { TerminologyAPI } from "../api/TerminologyAPI";
import { buildDeepLinkUrl } from "../lib/cohortBuilder";
import {
  buildCohortCatalog,
  findAttributeAcrossCards,
  findAttributeByName,
  findCardByName,
  summarizeCatalog,
} from "../lib/cohortCatalog";
import { resolveClausesToConstraints } from "../lib/cohortResolver";
import { buildCohortBookmarkTree } from "../lib/cohortBookmarkTree";
import { buildResolverDeps, makeValueFetcher } from "../lib/cohortResolverDeps";
import {
  DEFAULT_VALUE_LIMIT,
  MAX_VALUE_LIMIT,
  renderValueListing,
  searchAttributeValues,
} from "../lib/cohortValueResolver";
import type { CohortClause } from "../lib/cohortClause";
import {
  requireAuthAndDataset,
  createStructuredResponse,
  createTextResponse,
} from "../utils/request-helpers";

const analyticsApi = new AnalyticsAPI();
const terminologyApi = new TerminologyAPI();

/**
 * Register the D2E Patient Analytics cohort deep-link surface: discover the
 * dataset's filter cards, discover an attribute's stored values, then serialise
 * a cohort into a builder deep link.
 *
 * This is the surface the assistant has when Patient Analytics is NOT mounted,
 * so it has to be self-sufficient — the model cannot look a value up on screen,
 * and telling the user to go and check one themselves is a non-answer. The LLM
 * extracts intent; these tools deterministically resolve it against the live PA
 * config and serialise the rule-bound bookmark tree (a wrong tree silently
 * loads the WRONG cohort, which reads as a valid clinical result).
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
        "'category' (an exact stored token — list them with " +
        "list_cohort_filter_values), 'conceptSet' (clinical concept set / " +
        "phenotype) or 'datetime'. Only reference cards and attributes returned " +
        "here. Patient demographics (age, gender, race, ethnicity) are on the " +
        "patient card, not on event cards.",
      inputSchema: {},
      // No outputSchema on purpose: the MCP adapter then hands the model the
      // clean text summary (card -> attribute[kind]) instead of a 142-item JSON
      // blob, which the model can actually read and act on.
    },
    async (_args, { requestInfo }) => {
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);
      const fe = await analyticsApi.getFrontendConfig(authorization, datasetId);
      if (!fe) {
        throw new Error(
          `No Patient Analytics config for dataset ${datasetId}.`,
        );
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

  // Value discovery: the exact tokens a category/text attribute stores. Without
  // this the deep-link surface can only guess a token and read the build
  // failure as "the dataset doesn't have that value" — which is how "ER Visit"
  // became "no value found, please check the live cohort builder" instead of
  // "Emergency Room Visit".
  server.registerTool(
    "list_cohort_filter_values",
    {
      title: "List Cohort Filter Values",
      description:
        "List the values a `category` attribute can take on the CURRENT " +
        "dataset, so a cohort filter carries the EXACT stored token. `card` and " +
        "`attribute` are names from list_cohort_filters. OMIT `query` to get the " +
        "attribute's COMPLETE value list — do that for any small enumerated " +
        "column (gender, race, ethnicity, visit/encounter type) instead of " +
        "guessing a search term. With a `query` this already rechecks for you: " +
        "an empty search is re-matched against the attribute's full domain " +
        "(casing, demographic synonyms, any acronym the values spell out — ER, " +
        "ICU, NICU — a stored code like F for Female, and the words that " +
        "actually tell that column's rows apart) " +
        "and, failing that, the whole list is returned. So a zero-hit search is " +
        "NEVER proof a value is absent, and you must never ask the user for a " +
        "spelling or synonym instead of calling this. Pass a returned value " +
        "verbatim as a build_d2e_cohort_deeplink constraint value.",
      inputSchema: {
        card: z.string().describe("Filter card name from list_cohort_filters."),
        attribute: z
          .string()
          .describe("Attribute name on that card, e.g. 'Gender'."),
        query: z
          .string()
          .optional()
          .describe(
            "Search term, e.g. 'emergency'. Omit to list every value the " +
              "attribute can take.",
          ),
        limit: z
          .number()
          .int()
          .optional()
          .describe(
            `Max rows to return (default ${DEFAULT_VALUE_LIMIT}, max ${MAX_VALUE_LIMIT}).`,
          ),
      },
      // No outputSchema: the model only ever sees `content` text (see toolText.ts).
    },
    async ({ card, attribute, query, limit }, { requestInfo }) => {
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);
      const fe = await analyticsApi.getFrontendConfig(authorization, datasetId);
      if (!fe) {
        throw new Error(`No Patient Analytics config for dataset ${datasetId}.`);
      }
      const catalog = buildCohortCatalog(fe.config);

      const matchedCard = findCardByName(catalog, card);
      if (!matchedCard) {
        throw new Error(
          `Unknown filter card "${card}". Available: ${catalog.cards
            .map((c) => c.name)
            .join(", ")}.`,
        );
      }
      const attr = findAttributeByName(matchedCard, attribute);
      if (!attr) {
        const elsewhere = findAttributeAcrossCards(catalog, attribute).filter(
          (hit) => hit.card.key !== matchedCard.key,
        );
        throw new Error(
          `Card "${matchedCard.name}" has no attribute "${attribute}". ` +
            `Available: ${matchedCard.attributes.map((a) => a.name).join(", ")}.` +
            (elsewhere.length
              ? ` It IS on card "${elsewhere[0].card.name}".`
              : ""),
        );
      }
      if (attr.kind !== "category") {
        throw new Error(
          `"${attr.name}" on "${matchedCard.name}" is a ${attr.kind} attribute, ` +
            `which has no value list. ${
              attr.kind === "num"
                ? "Pass a number and an operator directly."
                : attr.kind === "conceptSet"
                  ? "Use the concept-set tools (list_concept_sets / create_concept_set) and pass the id."
                  : "It is not supported by the deep-link builder yet."
            }`,
        );
      }

      const cap = Math.max(
        1,
        Math.min(limit ?? DEFAULT_VALUE_LIMIT, MAX_VALUE_LIMIT),
      );
      const fetchValues = makeValueFetcher(
        analyticsApi,
        {
          authorization,
          datasetId,
          configId: fe.meta.configId,
          configVersion: fe.meta.configVersion,
        },
        attr.configPath,
      );
      const result = await searchAttributeValues(fetchValues, query ?? "");
      console.log(
        `[cohort-builder] list_cohort_filter_values: dataset=${datasetId} ` +
          `attr=${attr.configPath} query=${JSON.stringify(query ?? "")} ` +
          `matchedVia=${result.matchedVia} rows=${result.rows.length}`,
      );

      return createTextResponse(
        renderValueListing({
          cardName: matchedCard.name,
          attributeName: attr.name,
          query: (query ?? "").trim(),
          result,
          cap,
        }),
      );
    },
  );

  server.registerTool(
    "build_d2e_cohort_deeplink",
    {
      title: "Build D2E Cohort Deep Link",
      description:
        "Build a Patient Analytics cohort builder deep link from a list of " +
        "filter clauses. First call list_cohort_filters to learn the cards and " +
        "attributes, resolve every category value with list_cohort_filter_values, " +
        "and resolve any clinical concept to a concept-set id " +
        "(search_concepts / phenotype library → check_concept_coverage_in_dataset " +
        "→ create_concept_set). Each clause targets ONE card and clauses are " +
        "AND-ed: `card` is a card name; `conceptSetId` attaches a concept set to " +
        "an event card; `constraints` are {attribute, op, value} on that card's " +
        "attributes (op: >=,<=,<,>,=,!=; `range` with [low,high]; `in` with a " +
        "list of category values to match ANY of them); `exclude:true` negates " +
        "the card. Patient demographics (age, gender, race) are attributes of the " +
        "patient card ('Basic Data'), so they go in their own clause — never on " +
        "an event card. Returns a URL that opens the PA cohort builder pre-filled. " +
        "An error from this tool names the fix (valid cards/attributes, or the " +
        "candidate values) — act on it and retry rather than reporting a dead end.",
      inputSchema: {
        clauses: z
          .array(
            z.object({
              card: z
                .string()
                .describe("Filter card name from list_cohort_filters."),
              exclude: z
                .boolean()
                .optional()
                .describe("Negate this card (exclude matching patients)."),
              conceptSetId: z
                .number()
                .int()
                .optional()
                .describe("Concept-set id for an event card (agent-resolved)."),
              constraints: z
                .array(
                  z.object({
                    attribute: z
                      .string()
                      .describe(
                        "Attribute name ON THIS CARD, from list_cohort_filters.",
                      ),
                    op: z
                      .string()
                      .describe(
                        "num: >=,<=,<,>,=,!= or 'range'. category: '=' , 'in' " +
                          "(any of a list), '!=' / 'not in' to exclude.",
                      ),
                    value: z
                      .union([
                        z.number(),
                        z.string(),
                        z.array(z.union([z.number(), z.string()])),
                      ])
                      .describe(
                        "Number for num; [low, high] for 'range'; an exact " +
                          "stored token from list_cohort_filter_values for " +
                          "category (an array of them with op 'in').",
                      ),
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
        throw new Error(
          `No Patient Analytics config for dataset ${datasetId}.`,
        );
      }
      const catalog = buildCohortCatalog(fe.config);

      // 2. Resolve clauses -> constraints. num/range are pure; category values
      //    hit the analytics values endpoint; conceptSetId passes through.
      //    Throws an LLM-actionable error on any unresolved clause.
      const deps = buildResolverDeps(analyticsApi, terminologyApi, {
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
      return createStructuredResponse(
        url,
        warning ? { url, warning } : { url },
      );
    },
  );
}
