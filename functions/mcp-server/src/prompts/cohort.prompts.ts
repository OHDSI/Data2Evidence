import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Register cohort-related prompts
 * - organize_cohort_ids_names_list
 *
 * Prompts provide template instructions for LLM to format and organize data
 */
export function registerCohortPrompts(server: McpServer) {
  // ==================== ORGANIZE COHORT IDS AND NAMES LIST ====================
  server.registerPrompt(
    "organize_cohort_ids_names_list",
    {
      title: "Organize Cohort IDs and Names List",
      description:
        "Rank and order the cohort_ids and names based on relevance of cohortInfo and clinical practices.",
      argsSchema: { cohortInfo: z.string() },
    },
    ({ cohortInfo }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please rank and organize the output after getting cohort id and names based on relevance of ${cohortInfo} with clinical practices. Output in format of cohortId: cohortName.`,
          },
        },
      ],
    })
  );
}
