import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpServerConfig } from "../utils/utils";
import { registerCohortManagementTools } from "../tools/cohort-management.tools";
import { registerPhenotypeLibraryTools } from "../tools/phenotype-library.tools";
import { registerCohortInstructionTools } from "../tools/cohort-instruction.tools";
import { registerCohortValidationTools } from "../tools/cohort-validation.tools";
import { registerCohortPrompts } from "../prompts/cohort.prompts";

export const server = new McpServer({
  name: McpServerConfig.NAME,
  version: McpServerConfig.VERSION,
});

// Register all tool groups
registerCohortManagementTools(server);
registerPhenotypeLibraryTools(server);
registerCohortInstructionTools(server);
registerCohortValidationTools(server);

// Register prompts
registerCohortPrompts(server);
