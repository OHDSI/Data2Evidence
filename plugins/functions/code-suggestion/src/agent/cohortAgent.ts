import {
  convertToModelMessages,
  jsonSchema,
  pipeUIMessageStreamToResponse,
  stepCountIs,
  streamText,
  tool,
  toUIMessageStream,
} from "ai";
import { createMCPClient } from "@ai-sdk/mcp";
import { env } from "../env";
import { getAgentModel } from "./models";
import { getCohortAgentPrompt } from "./cohortAgentPrompt";

/**
 * The cohort agent behind the portal's AI assistant drawer.
 *
 * Two kinds of tool go into one loop:
 *  - SERVER tools come from the d2e-mcp server over HTTP and have an `execute`,
 *    so the SDK runs them here with the caller's bearer token.
 *  - CLIENT tools are the browser's `pa_*` WebMCP tools. They are declared with
 *    NO `execute`, which makes the SDK stream the tool call to the browser and
 *    end the turn. The drawer runs it against the live PA store, appends the
 *    output, and resubmits — so this endpoint stays stateless and the whole
 *    transcript lives in the client.
 */

// Scope the server surface to cohort building. The MCP server also exposes ATLAS
// and Strategus tooling; handing the model 20+ unrelated tools measurably
// degrades tool choice and adds latency to every step.
const COHORT_AGENT_SERVER_TOOLS = new Set([
  "list_cohort_filters",
  "build_d2e_cohort_deeplink",
  "search_concepts",
  "check_concept_coverage_in_dataset",
  "list_concept_sets",
  "get_concept_set",
  "create_concept_set",
  "search_phenotype_library",
]);

// A cohort can legitimately need many steps (catalog → search → coverage →
// create set → patch → verify), but an unbounded loop on a confused model is a
// runaway spend. 16 leaves headroom over the ~8-step happy path.
const MAX_STEPS = 16;

/** Tool descriptor as published by the PA bridge and forwarded by the drawer. */
export interface ClientToolDescriptor {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface CohortAgentRequest {
  /** UIMessage[] from the AI SDK's useChat, including any tool outputs. */
  messages: any[];
  token: string;
  datasetId: string;
  clientTools: ClientToolDescriptor[];
  model?: string;
}

// Only `pa_*` tools may be executed in the browser. The descriptors arrive over
// HTTP from the client, so treat them as untrusted input: a descriptor naming a
// server tool would shadow the real one and quietly turn a server-side action
// into "whatever the page said it did".
function toClientTools(descriptors: ClientToolDescriptor[]): Record<string, any> {
  const tools: Record<string, any> = {};
  for (const descriptor of descriptors ?? []) {
    if (!descriptor?.name?.startsWith("pa_")) {
      console.warn(`[cohort-agent] ignoring non-pa client tool "${descriptor?.name}"`);
      continue;
    }
    tools[descriptor.name] = tool({
      description: descriptor.description,
      // The schema is the PA tool's own JSON Schema; jsonSchema() keeps this
      // free of any zod-version coupling between the two packages.
      inputSchema: jsonSchema((descriptor.inputSchema ?? { type: "object", properties: {} }) as any),
      // No execute: the SDK forwards the call to the browser.
    });
  }
  return tools;
}

export class AgentUnavailableError extends Error {}

/**
 * Run one agent turn and pipe an AI SDK UI message stream into `res`.
 *
 * Resolves once the response has been fully written.
 */
export async function streamCohortAgent(
  res: any,
  { messages, token, datasetId, clientTools, model: modelId }: CohortAgentRequest,
): Promise<void> {
  const { model, error } = await getAgentModel(modelId);
  if (!model) {
    throw new AgentUnavailableError(error);
  }

  const mcpUrl = env.SERVICE_ROUTES?.["mcp-server"];
  if (!mcpUrl) {
    throw new AgentUnavailableError("No url is set for the MCP server (SERVICE_ROUTES['mcp-server']).");
  }

  const start = performance.now();
  const mcpClient = await createMCPClient({
    transport: {
      type: "http",
      url: mcpUrl,
      // The MCP tools authorise per call and scope every query to the dataset,
      // so the user's own token is forwarded rather than a service identity.
      headers: { Authorization: token, datasetId },
    },
  });

  try {
    const allServerTools = await mcpClient.tools();
    const serverTools = Object.fromEntries(
      Object.entries(allServerTools).filter(([name]) => COHORT_AGENT_SERVER_TOOLS.has(name)),
    );
    const browserTools = toClientTools(clientTools);
    const tools = { ...serverTools, ...browserTools };
    const paToolNames = Object.keys(browserTools);

    console.log(
      `[MCP-TIMING] [cohort-agent] tools ready in ${(performance.now() - start).toFixed(1)}ms ` +
        `server=${Object.keys(serverTools).length}/${Object.keys(allServerTools).length} ` +
        `browser=${paToolNames.length}`,
    );

    const result = streamText({
      model,
      system: getCohortAgentPrompt({
        datasetId,
        paToolsAvailable: paToolNames.length > 0,
        paToolNames,
      }),
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(MAX_STEPS),
      onError: ({ error: streamError }) => {
        console.error("[cohort-agent] stream error:", streamError);
      },
    });

    await pipeUIMessageStreamToResponse({
      response: res,
      stream: toUIMessageStream({
        stream: result.stream,
        tools,
        // Surface the real reason a step failed. These messages are already
        // written for the model to act on (e.g. "no attribute X; available: …"),
        // and hiding them behind "An error occurred" makes the assistant claim
        // success it did not have.
        onError: (streamError: unknown) =>
          streamError instanceof Error ? streamError.message : String(streamError),
      }),
    });
  } finally {
    // Closing before the stream drains would abort in-flight tool calls, so this
    // only runs once pipeUIMessageStreamToResponse has resolved.
    await mcpClient.close().catch((closeError: unknown) => {
      console.warn("[cohort-agent] MCP client close failed:", closeError);
    });
  }
}
