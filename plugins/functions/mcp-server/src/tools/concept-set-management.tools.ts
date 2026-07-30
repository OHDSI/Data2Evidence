import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { D2EWebAPI, ConceptSetItem } from "../api/D2EWebAPI.ts";
import { TerminologyAPI } from "../api/TerminologyAPI";
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
        "List all concept sets in the current dataset that the user owns or that are shared. Returns ref (e.g. legacy:1 or webapi:2), id, name, shared flag, last-modified date. Pages to 50 items; if more exist, the response asks the user to narrow.",
      inputSchema: ListConceptSetsInput,
    },
    async ({}, { requestInfo }) => {
      const toolStart = performance.now();
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);
      const all = await d2eWebApi.listConceptSets(authorization, datasetId);
      const totalCount = all.length;
      const page = all.slice(0, LIST_PAGE_SIZE).map((cs) => ({
        ref: cs.id,
        id: cs.externalId,
        source: cs.source,
        name: cs.name,
        shared: cs.shared,
        modifiedDate: cs.modifiedDate,
      }));

      console.log(
        `[MCP-TIMING] [list_concept_sets] END total=${(performance.now() - toolStart).toFixed(1)}ms items=${page.length} totalCount=${totalCount}`,
      );

      const text =
        totalCount > LIST_PAGE_SIZE
          ? `Showing ${LIST_PAGE_SIZE} of ${totalCount} concept sets. Ask the user to narrow by name or shared/private.`
          : `Found ${totalCount} concept set${totalCount === 1 ? "" : "s"} in this dataset.`;

      return createStructuredResponse(text, { conceptSets: page, totalCount });
    },
  );

  // ==================== GET CONCEPT SET ====================
  server.registerTool(
    "get_concept_set",
    {
      title: "Get Concept Set",
      description:
        "Get one concept set by its compound ref (e.g. legacy:123 or webapi:456). Returns the SAVED definition: name, shared, and the concept expression (rule with descendants/excludes flags). Does NOT return the resolved concept-id list — only the saved expression.",
      inputSchema: GetConceptSetInput,
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

      return createStructuredResponse(
        `Retrieved concept set ${conceptSet.id}, name '${conceptSet.name}', ${expression.items?.length ?? 0} concepts in expression.`,
        { conceptSet: { ...conceptSet, expression } }
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

      const created = await d2eWebApi.createConceptSet(
        authorization,
        datasetId,
        { name, description, shared: false, items: (items ?? []) as ConceptSetItem[] }
      );

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

      const text =
        missing.length === 0
          ? `All ${found.length} concept${found.length === 1 ? "" : "s"} exist in this dataset.`
          : `${found.length} of ${conceptIds.length} concepts exist in this dataset. ${missing.length} are not in the vocabulary cache: ${missing.join(", ")}.`;

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
            standardConcept: z.string().nullable(),
          }),
        ),
      },
    },
    async (
      { query, domain, standardOnly = true, limit = 20 },
      { requestInfo },
    ) => {
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);
      const concepts = await vocabularyApi.searchConcepts(
        authorization,
        datasetId,
        query,
        domain,
        standardOnly,
        limit,
      );
      const summary = concepts.length
        ? `Found ${concepts.length} concept(s) for "${query}"${domain ? ` in ${domain}` : ""} ` +
          `(ranked by record count). Pick the right concept id(s).\n` +
          concepts
            .slice(0, 10)
            .map(
              (c) =>
                `- ${c.conceptId} ${c.conceptName} [${c.domainId}/${c.vocabularyId}]`,
            )
            .join("\n")
        : `No concepts found for "${query}"${domain ? ` in ${domain}` : ""}. Try a different term or domain.`;
      return createStructuredResponse(summary, { concepts });
    },
  );
}
