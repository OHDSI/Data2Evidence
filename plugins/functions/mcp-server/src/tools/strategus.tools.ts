import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  get_strategus_module_list,
  strategus_system_prompt,
} from "../utils/strategus_helpers";

export function registerStrategusTools(server: McpServer) {
  // tools for Strategus related queries
  // tools for Strategus related queries
  server.registerTool(
    "strategus_list_modules",
    {
      title: "List Strategus Modules",
      description: `Retrieve a list of all available OHDSI Strategus R modules.
    Each module corresponds to an analytic component used in the Strategus study pipeline
    (e.g., Characterization, CohortMethod, PatientLevelPrediction, etc.).
    Returns each module's name and a brief description.`,
      outputSchema: {
        module_list: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
          })
        ),
      },
    },
    async () => {
      const output = await get_strategus_module_list();
      return {
        content: [{ type: "text", text: JSON.stringify(output) }],
        structuredContent: { module_list: output },
      };
    }
  );

  server.registerTool(
    "strategus_initial_instructions",
    {
      title:
        "Use these initial system instructions for any Strategus related query",
      description: `This tool provides the mandatory initial system instructions to be used for any Strategus-related 
    query. It must always be applied first, before any other tool or query, and provides the foundational 
    guidelines and context for generating R code using OHDSI's Strategus framework.`,
      inputSchema: {},
      outputSchema: {
        messages: z.array(
          z.object({
            role: z.string(),
            content: z.object({
              type: z.string(),
              text: z.string(),
            }),
          })
        ),
      },
      _meta: {
        tool_priority: "high",
        usage: "system_prompt",
      },
    },
    async () => {
      const output = await strategus_system_prompt();
      return {
        content: [{ type: "text", text: JSON.stringify(output) }],
        structuredContent: { messages: output },
      };
    }
  );

  server.registerTool(
    "strategus_reference_code_template",
    {
      title:
        "Reference R code `template` that shows how to use Strategus Modules",
      description: ` This template contains sample code for many Strategus modules and their settings.
    It is one example of how a specification file looks like.
      `,
      inputSchema: {},
      outputSchema: {
        usage_instructions: z.string(),
        reference_code: z.string(),
      },
    },
    async () => {
      const githubUrl = `https://raw.githubusercontent.com/ohdsi-studies/StrategusStudyRepoTemplate/refs/heads/main/CreateStrategusAnalysisSpecification.R`;

      console.log(`Fetching reference code from: ${githubUrl}`);
      const response = await fetch(githubUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch R file: ${response.status} ${response.statusText}`
        );
      }
      const result = await response.text();
      const final_result = `Below is the reference R code template for Strategus. 
    Once you know which modules to use for the user's study, you can refer to this template for those modules' R 
    code structure and syntax.
    Only use the modules that are relevant to the user's analysis.
    CohortGenerator module must always be included in the analysis specification file since every Strategus study has cohorts.  
    
    Template Code: ${result}`;
      // console.log(`Fetched result - \n`, result);

      return {
        content: [{ type: "text", text: final_result }],
        structuredContent: {
          reference_code: final_result,
        },
      };
    }
  );
}
