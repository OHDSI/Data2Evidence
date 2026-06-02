import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TerminologyAPI } from "../api/TerminologyAPI";
import {
  GetIncludedConceptsInput,
  PreviewConceptSetResolutionInput,
} from "../types/tool-schemas";
import {
  requireAuthAndDataset,
  createStructuredResponse,
} from "../utils/request-helpers";

const terminologyApi = new TerminologyAPI();

const RESOLUTION_CAP = 2000;

/**
 * Register concept set resolution tools.
 * - get_included_concepts          (resolves a SAVED set → concept-id list)
 * - preview_concept_set_resolution (resolves a candidate expression → concept-id list, before save)
 */
export function registerConceptSetResolutionTools(server: McpServer) {
  // ==================== GET INCLUDED CONCEPTS ====================
  server.registerTool(
    "get_included_concepts",
    {
      title: "Get Included Concepts",
      description:
        "Resolve a SAVED concept set to the actual list of OMOP concept IDs it includes, after descendants and excludes are applied. Use this when you need to know which concept IDs are in a saved set. To preview before saving, use preview_concept_set_resolution instead.",
      inputSchema: GetIncludedConceptsInput,
    },
    async ({ conceptSetId }, { requestInfo }) => {
      const toolStart = performance.now();
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);

      const allIds = await terminologyApi.getIncludedConcepts(
        authorization,
        datasetId,
        [conceptSetId]
      );

      const totalResolved = allIds.length;
      const truncated = totalResolved > RESOLUTION_CAP;
      const ids = truncated ? allIds.slice(0, RESOLUTION_CAP) : allIds;

      console.log(
        `[MCP-TIMING] [get_included_concepts] END total=${(performance.now() - toolStart).toFixed(1)}ms resolved=${totalResolved} truncated=${truncated}`
      );

      const text = truncated
        ? `Concept set ${conceptSetId} resolved to ${totalResolved} concepts; showing first ${RESOLUTION_CAP}. The full set is materialized server-side for cohort use — the LLM does not need the full list.`
        : `Concept set ${conceptSetId} resolved to ${totalResolved} concept${totalResolved === 1 ? "" : "s"}.`;

      return createStructuredResponse(text, {
        conceptIds: ids,
        totalResolved,
        truncated,
      });
    }
  );

  // ==================== PREVIEW CONCEPT SET RESOLUTION ====================
  server.registerTool(
    "preview_concept_set_resolution",
    {
      title: "Preview Concept Set Resolution",
      description:
        "Preview what concepts a candidate expression WOULD resolve to, BEFORE saving. Use this to validate a concept set design with the user before calling create_concept_set. Input is the same concepts array format as create_concept_set.",
      inputSchema: PreviewConceptSetResolutionInput,
    },
    async ({ concepts }, { requestInfo }) => {
      const toolStart = performance.now();
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);

      const allIds = await terminologyApi.previewResolution(
        authorization,
        datasetId,
        concepts
      );

      const totalResolved = allIds.length;
      const truncated = totalResolved > RESOLUTION_CAP;
      const ids = truncated ? allIds.slice(0, RESOLUTION_CAP) : allIds;

      console.log(
        `[MCP-TIMING] [preview_concept_set_resolution] END total=${(performance.now() - toolStart).toFixed(1)}ms resolved=${totalResolved} truncated=${truncated}`
      );

      const text = truncated
        ? `This expression would resolve to ${totalResolved} concepts; showing first ${RESOLUTION_CAP}. If this looks right, call create_concept_set with the same concepts array.`
        : `This expression would resolve to ${totalResolved} concept${totalResolved === 1 ? "" : "s"}. If this looks right, call create_concept_set with the same concepts array.`;

      return createStructuredResponse(text, {
        conceptIds: ids,
        totalResolved,
        truncated,
      });
    }
  );
}
