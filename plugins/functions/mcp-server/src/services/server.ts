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

/**
 * Build a fully-registered MCP server.
 *
 * Call this per request; never share one instance across concurrent requests.
 * `Protocol.connect()` overwrites `this._transport` unconditionally, and
 * `_onrequest` sends each result on whatever transport is current at dispatch
 * time. With a shared server, parallel tool calls interleave — one call's
 * result goes out on another call's transport, which has no stream for that
 * request id, so the send throws into `onerror` (a no-op by default) and the
 * originating HTTP response is never written. The client then waits on that
 * tool result forever, which is exactly how the agent hung on multi-clause
 * cohort prompts that fan out several `list_concept_sets` calls at once.
 *
 * Registration is synchronous and in-memory, so a fresh server per request
 * costs nothing worth optimising away.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: MCP_SERVER_CONFIG.NAME,
    version: MCP_SERVER_CONFIG.VERSION,
  });

  // Register all tool groups
  registerCohortManagementTools(server);
  registerPhenotypeLibraryTools(server);
  registerCohortInstructionTools(server);
  registerCohortValidationTools(server);

  // D2E/PA cohort building. These are the "PA is not mounted" surface: the catalog
  // and the deterministic deep link are derived from the dataset's PA config on the
  // server, so the agent can still compose a cohort (and hand back a link that opens
  // it) when the browser has no live builder. While PA IS mounted, the WebMCP pa_*
  // tools are preferred — they edit the cohort on screen in place.
  registerCohortBuilderTools(server);

  // Register Strategus tools
  registerStrategusTools(server);

  // Register concept set tools
  registerConceptSetManagementTools(server);

  // Register prompts
  registerCohortPrompts(server);

  return server;
}
