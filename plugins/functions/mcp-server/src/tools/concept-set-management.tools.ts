import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  ConceptSetItem,
  ConceptSetItemsNotSavedError,
  D2EWebAPI,
} from "../api/D2EWebAPI.ts";
import { TerminologyAPI, ConceptItem } from "../api/TerminologyAPI";
import { VocabularyAPI } from "../api/VocabularyAPI";
import {
  ListConceptSetsInput,
  GetConceptSetInput,
  CreateConceptSetInput,
  CheckConceptCoverageInput,
  SearchConceptsInput,
} from "../types/tool-schemas";
import {
  requireAuthAndDataset,
  createStructuredResponse,
  createTextResponse,
} from "../utils/request-helpers";
import {
  formatConceptSetExpression,
  formatConceptSetListing,
} from "../lib/toolText";

const d2eWebApi = new D2EWebAPI();
const terminologyApi = new TerminologyAPI();
const vocabularyApi = new VocabularyAPI();

const LIST_PAGE_SIZE = 50;

function sameConceptDefinition(
  left: ConceptItem[],
  right: ConceptItem[],
): boolean {
  const normalize = (items: ConceptItem[]) =>
    items
      .map((item) =>
        JSON.stringify({
          id: Number(item.id),
          useDescendants: Boolean(item.useDescendants),
          useMapped: Boolean(item.useMapped),
          isExcluded: Boolean(item.isExcluded),
        })
      )
      .sort();
  const a = normalize(left);
  const b = normalize(right);
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

/**
 * Register concept set tools.
 * - search_concepts                  (clinical term -> candidate OMOP concept ids)
 * - list_concept_sets                (paginated: first 50 + totalCount)
 * - get_concept_set                  (returns saved definition + concept list)
 * - create_concept_set               (creates in d2e-webapi; defaults shared=false)
 * - check_concept_coverage_in_dataset (which concept IDs exist in this dataset's vocabulary)
 *
 * search_concepts is the entry rung: it turns a plain clinical term into concept
 * IDs, which the other tools (check_concept_coverage_in_dataset / create_concept_set)
 * then consume.
 */
export function registerConceptSetManagementTools(server: McpServer) {
  // ==================== LIST CONCEPT SETS ====================
  server.registerTool(
    "list_concept_sets",
    {
      title: "List Concept Sets",
      description:
        "List the concept sets in the current dataset that the user owns or that are shared, optionally " +
        "filtered by name with `query`. Returns ref (e.g. legacy:1 or webapi:2), id, name, shared flag, " +
        "last-modified date. Call this with `query` set to the clinical term BEFORE building a new concept " +
        "set — reusing a set the user already has beats creating a near-duplicate. Pages to 50 items; " +
        "narrow with `query` if more exist.",
      inputSchema: ListConceptSetsInput,
      // No outputSchema on purpose, matching list_cohort_filters: the adapter hands
      // the model the text below, and structuredContent never reaches it. See the
      // note in ../lib/toolText.ts — putting the ids only in structuredContent is
      // what made this tool unusable in the first place.
    },
    async ({ query }, { requestInfo }) => {
      const toolStart = performance.now();
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);
      const all = await d2eWebApi.listConceptSets(authorization, datasetId);
      // Filtered here rather than in the API call: /concept-set has no name
      // parameter, and the list is per-dataset and small enough to scan.
      const needle = query?.trim().toLowerCase();
      const matched = needle
        ? all.filter((cs) => cs.name.toLowerCase().includes(needle))
        : all;
      const totalCount = matched.length;
      const page = matched.slice(0, LIST_PAGE_SIZE).map((cs) => ({
        ref: cs.id,
        id: cs.externalId,
        source: cs.source,
        name: cs.name,
        shared: cs.shared,
        modifiedDate: cs.modifiedDate,
      }));

      console.log(
        `[MCP-TIMING] [list_concept_sets] END total=${(performance.now() - toolStart).toFixed(1)}ms ` +
          `items=${page.length} totalCount=${totalCount} query=${needle ?? "-"}`,
      );

      // The list itself, in the text. A count alone is unusable: the model cannot
      // reuse, disambiguate or fetch a set whose id it has never been told, and its
      // only remaining moves are to re-call this tool or to guess an id.
      // Render the compound ref, not externalId — the ref is what get_concept_set
      // takes, so the ref is what has to reach the model verbatim.
      const listing = formatConceptSetListing(
        page.map((cs) => ({ id: cs.ref, name: cs.name, shared: cs.shared })),
      );

      let text: string;
      if (needle && totalCount === 0) {
        // Say the search ran and came back empty, so this reads as a cleared
        // reuse check rather than as "the tool didn't work" — the model's next
        // step is legitimately to build a new set.
        text =
          `No existing concept set matches "${query}" (searched ${all.length} set${all.length === 1 ? "" : "s"} ` +
          `in this dataset). Nothing to reuse — build a new set from the vocabulary instead. Do NOT call this ` +
          `tool again with the same query.`;
      } else if (totalCount > LIST_PAGE_SIZE) {
        text =
          `Showing ${LIST_PAGE_SIZE} of ${totalCount} concept sets. Narrow with the \`query\` argument ` +
          `(a substring of the name) rather than asking the user.\n${listing}`;
      } else {
        text =
          `Found ${totalCount} concept set${totalCount === 1 ? "" : "s"}` +
          (needle ? ` matching "${query}"` : " in this dataset") +
          `. These are the ONLY ids that exist for this query — use one of them verbatim and never invent ` +
          `or increment an id. Prefer reusing one over creating a near-duplicate. If more than one could ` +
          `plausibly be what the user meant, ask them which — do not pick for them.\n${listing}`;
      }

      return createStructuredResponse(text, { conceptSets: page, totalCount });
    },
  );

  // ==================== GET CONCEPT SET ====================
  server.registerTool(
    "get_concept_set",
    {
      title: "Get Concept Set",
      description:
        "Get one concept set by its compound ref (e.g. legacy:123 or webapi:456) — the ref must come from " +
        "`list_concept_sets`, never guessed. Returns the SAVED definition: name, shared, and the concept " +
        "expression (rule with descendants/excludes flags). Does NOT return the resolved concept-id list — " +
        "only the saved expression.",
      inputSchema: GetConceptSetInput,
      // No outputSchema — see list_concept_sets. The expression is written into the
      // text below, which is the only part the model receives.
    },
    async ({ conceptSetRef }, { requestInfo }) => {
      const toolStart = performance.now();
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);

      const [conceptSet, expression] = await Promise.all([
        d2eWebApi.getConceptSet(authorization, datasetId, conceptSetRef),
        d2eWebApi
          .getConceptSetExpression(authorization, datasetId, conceptSetRef)
          .catch(() => ({ items: [] })),
      ]);

      console.log(
        `[MCP-TIMING] [get_concept_set] END total=${(performance.now() - toolStart).toFixed(1)}ms`,
      );

      // Spell the expression out. "3 concepts in expression" tells the model nothing
      // it can act on — whether this set is the right one for the user's term is
      // exactly the judgement the concept rows support and the count does not.
      // On d2e-webapi the rows live on the separately-fetched expression, not on
      // the concept set itself.
      const concepts: unknown[] = Array.isArray(expression?.items)
        ? expression.items
        : [];

      return createStructuredResponse(
        `Concept set ${conceptSet.id} '${conceptSet.name}'${conceptSet.shared ? " (shared)" : ""} — ` +
          `${concepts.length} item${concepts.length === 1 ? "" : "s"} in the expression.\n` +
          formatConceptSetExpression(concepts),
        { conceptSet: { ...conceptSet, expression } },
      );
    },
  );

  // ==================== CREATE CONCEPT SET ====================
  server.registerTool(
    "create_concept_set",
    {
      title: "Create Concept Set",
      description:
        "Create a new concept set in d2e-webapi from a list of OMOP concept items. Returns the new concept set ref. Defaults to private (shared=false).",
      inputSchema: CreateConceptSetInput,
    },
    async ({ name, description, items }, { requestInfo }) => {
      const toolStart = performance.now();
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);

      let created;
      try {
        created = await d2eWebApi.createConceptSet(
          authorization,
          datasetId,
          { name, description, shared: false, items: (items ?? []) as ConceptSetItem[] }
        );
      } catch (error) {
        // Say what is actually on disk now, in the same breath as the reason. The
        // transport-level messages ("d2e-webapi returned a server error") read like
        // a transient hiccup, and a model that has just walked the user through
        // approving a concept list will round that up to "created" — which is
        // exactly the failure this wording exists to stop.
        if (error instanceof ConceptSetItemsNotSavedError) {
          // A half-written set is worse than none: it exists, so it can be picked
          // and filtered on, and an empty set silently returns zero patients.
          throw new Error(
            `${error.message} Tell the user the set exists but is EMPTY and must be ` +
              `deleted or repaired before use. Do not treat it as a usable concept set ` +
              `and do not attach it to a cohort.`,
          );
        }
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Concept set '${name}' was NOT created and nothing was saved. ${reason} ` +
            `Tell the user it failed and why. Do not describe the set as created, do not ` +
            `give it an id, and do not refer to it later as though it exists.`,
        );
      }

      console.log(
        `[MCP-TIMING] [create_concept_set] END total=${(performance.now() - toolStart).toFixed(1)}ms ref=${created.id} items=${items?.length ?? 0}`
      );

      return createTextResponse(
        `Successfully created concept set '${name}' with ref ${created.id}. ${items?.length ?? 0} concept item${(items?.length ?? 0) === 1 ? "" : "s"} in the expression.`
      );
    },
  );

  // ==================== CHECK CONCEPT COVERAGE ====================
  server.registerTool(
    "check_concept_coverage_in_dataset",
    {
      title: "Check Concept Coverage in Dataset",
      description:
        "Check which OMOP concept IDs exist in this dataset's vocabulary cache. Returns found and missing IDs. Use this before create_concept_set to inform the user which concepts have data in this dataset.",
      inputSchema: CheckConceptCoverageInput,
    },
    async ({ conceptIds }, { requestInfo }) => {
      const toolStart = performance.now();
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);

      const { found, missing } = await terminologyApi.checkConceptCoverage(
        authorization,
        datasetId,
        conceptIds,
      );

      console.log(
        `[MCP-TIMING] [check_concept_coverage_in_dataset] END total=${(performance.now() - toolStart).toFixed(1)}ms found=${found.length} missing=${missing.length}`,
      );

      let text: string;
      if (missing.length === 0) {
        text = `All ${found.length} concept${found.length === 1 ? "" : "s"} exist in this dataset.`;
      } else if (found.length === 0) {
        // Every id missing usually means the OMOP-standard path doesn't apply here
        // (a SAP HANA / LEAF dataset that filters on SOURCE concept codes / concept
        // sets, not standard concept ids). Say so explicitly so the model stops
        // retrying search_concepts / create_concept_set — which would build a
        // zero-coverage set — and routes to the live builder's FE-native path.
        text =
          `None of the ${conceptIds.length} concept id(s) are in this dataset's vocabulary cache ` +
          `(${missing.join(", ")}). This dataset likely does NOT use the OMOP standard vocabulary ` +
          `(e.g. a SAP HANA / LEAF dataset whose condition/drug/measurement filters use source concept ` +
          `codes or concept sets). Stop routing this term through search_concepts / create_concept_set — ` +
          `resolve it on the live cohort builder with the WebMCP pa_search_attribute_values tool against ` +
          `the card's *source concept code* or *concept-name* attribute, which returns the exact selectable token(s).`;
      } else {
        text = `${found.length} of ${conceptIds.length} concepts exist in this dataset. ${missing.length} are not in the vocabulary cache: ${missing.join(", ")}.`;
      }

      return createStructuredResponse(text, { found, missing });
    },
  );

  // ==================== SEARCH CONCEPTS ====================
  // Clinical term -> candidate OMOP standard concepts (id, name, domain) for
  // THIS dataset. The rung between a plain word and the concept-set tools
  // (which take concept IDs): search here, pick the right concept(s), then feed
  // them to check_concept_coverage_in_dataset / create_concept_set.
  //
  // Use this for specific concepts (a measurement like "systolic blood
  // pressure", a drug, a procedure) and for terms the phenotype library doesn't
  // cover. For recognized phenotypes (a disease defining the cohort, e.g.
  // hypertension), prefer search_phenotype_library, which returns a curated set.
  server.registerTool(
    "search_concepts",
    {
      title: "Search OMOP Concepts",
      description:
        "Search this dataset's OMOP vocabulary for standard concepts matching " +
        "a clinical term (e.g. 'systolic blood pressure', 'metformin'). Returns " +
        "candidate concepts (conceptId, name, domain) ranked by how common they " +
        "are in the dataset. Use it to turn a clinical term into concept IDs for " +
        "check_concept_coverage_in_dataset / create_concept_set. Pass `domain` " +
        "to scope results (e.g. 'Condition', 'Measurement', 'Drug', 'Procedure').",
      inputSchema: SearchConceptsInput,
      outputSchema: {
        concepts: z.array(
          z.object({
            conceptId: z.number(),
            conceptName: z.string(),
            domainId: z.string(),
            vocabularyId: z.string(),
            // NULL in OMOP for non-standard concepts, which is precisely what the
            // source-concept fallback below returns. Declaring it required made the
            // client reject the payload and fail the whole search on that path.
            standardConcept: z.string().nullish(),
            conceptCode: z.string().optional(),
          }),
        ),
        sourceFallback: z.boolean().optional(),
      },
    },
    async (
      { query, domain, standardOnly = true, limit = 20 },
      { requestInfo },
    ) => {
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);
      let concepts = await vocabularyApi.searchConcepts(
        authorization,
        datasetId,
        query,
        domain,
        standardOnly,
        limit,
      );
      // Non-OMOP (SAP HANA / LEAF) datasets often filter on SOURCE concept codes
      // (e.g. ICD10CM) rather than OMOP standard concepts, so a STANDARD-only search
      // returns nothing. Retry once including non-standard/source concepts before
      // giving up, so those datasets still resolve a term to candidate ids.
      let sourceFallback = false;
      if (concepts.length === 0 && standardOnly) {
        concepts = await vocabularyApi.searchConcepts(
          authorization,
          datasetId,
          query,
          domain,
          false,
          limit,
        );
        sourceFallback = concepts.length > 0;
      }
      const summary = concepts.length
        ? `Found ${concepts.length} concept(s) for "${query}"${domain ? ` in ${domain}` : ""}` +
          (sourceFallback
            ? " — no STANDARD match; these include NON-STANDARD/source concepts (verify vocabulary/domain before use)"
            : "") +
          ` (ranked by record count). Pick the right concept id(s).\n` +
          concepts
            .slice(0, 10)
            .map(
              (c) =>
                `- ${c.conceptId} ${c.conceptName} [${c.domainId}/${c.vocabularyId}${c.conceptCode ? ` ${c.conceptCode}` : ""}/${c.standardConcept || "non-standard"}]`,
            )
            .join("\n")
        : `No concepts found for "${query}"${domain ? ` in ${domain}` : ""} (standard or source). ` +
          `This dataset may be non-OMOP (SAP HANA / LEAF): its coded condition/drug/measurement filters use ` +
          `source concept codes or concept sets, not the OMOP standard vocabulary. Resolve the term on the live ` +
          `cohort builder instead — WebMCP pa_search_attribute_values against the card's *source concept code* / ` +
          `concept-name attribute returns the exact selectable token(s). Or try a different term/domain.`;
      return createStructuredResponse(summary, { concepts, sourceFallback });
    },
  );
}
