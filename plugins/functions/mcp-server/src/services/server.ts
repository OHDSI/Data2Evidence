import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCP_SERVER_CONFIG } from "../config/server.config";
import { registerCohortManagementTools } from "../tools/cohort-management.tools";
import { registerPhenotypeLibraryTools } from "../tools/phenotype-library.tools";
import { registerCohortInstructionTools } from "../tools/cohort-instruction.tools";
import { registerCohortValidationTools } from "../tools/cohort-validation.tools";
import { registerCohortBuilderTools } from "../tools/cohort-builder.tools";
import { registerCohortPrompts } from "../prompts/cohort.prompts";
import { registerStrategusTools } from "../tools/strategus.tools";
import { registerConceptSetManagementTools } from "../tools/concept-set-management.tools";
import { registerConceptSetResolutionTools } from "../tools/concept-set-resolution.tools";

export const server = new McpServer({
  name: MCP_SERVER_CONFIG.NAME,
  version: MCP_SERVER_CONFIG.VERSION,
});

// Register all tool groups
registerCohortManagementTools(server);
registerPhenotypeLibraryTools(server);
registerCohortInstructionTools(server);
registerCohortValidationTools(server);
registerCohortBuilderTools(server);

// Register Strategus tools
registerStrategusTools(server);

// Register concept set tools (DATA-651)
registerConceptSetManagementTools(server);
registerConceptSetResolutionTools(server);

// Register prompts
registerCohortPrompts(server);
