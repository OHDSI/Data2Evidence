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
import { throwOnToolError } from "./mcpToolErrors";

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
  "list_cohort_filter_values",
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

/**
 * Concept review, run by the user rather than by code.
 *
 * Declared here (not forwarded from the page like the `pa_*` tools) because the
 * drawer always provides it: the assistant panel IS the surface it renders on. Like
 * the browser tools it has no `execute`, so the SDK streams the call to the client
 * and ends the turn — and the drawer deliberately leaves it unanswered until the
 * user has ticked the concepts they want. That pause is the point: a near-miss
 * concept in a set produces a wrong cohort that still looks like a valid result.
 */
export const CONFIRM_CONCEPTS_TOOL = "ui_confirm_concepts";

const confirmConceptsTool = tool({
  description:
    "Show the user the exact list of OMOP concepts you intend to put in a concept set and wait for " +
    "their approval. Renders an interactive list in the assistant panel where they can remove " +
    "concepts. Returns { approved, conceptIds } — the concepts they kept. Call this BEFORE " +
    "create_concept_set and build the set from the returned conceptIds ONLY. Do not call it for a " +
    "concept set that already exists.",
  inputSchema: jsonSchema({
    type: "object",
    properties: {
      conceptSetName: {
        type: "string",
        description: "Name of the concept set you will create, e.g. 'Type 2 diabetes mellitus'.",
      },
      intro: {
        type: "string",
        description: "One short sentence introducing the list. Omit to use the panel's default wording.",
      },
      concepts: {
        type: "array",
        description: "The concepts you propose to include — the shortlist, not every search hit.",
        items: {
          type: "object",
          properties: {
            conceptId: { type: "number", description: "OMOP concept id." },
            conceptName: { type: "string" },
            vocabularyId: { type: "string", description: "e.g. SNOMED, ICD10CM." },
            conceptCode: { type: "string", description: "Source code within that vocabulary, when known." },
            domainId: { type: "string" },
          },
          required: ["conceptId", "conceptName"],
        },
      },
    },
    required: ["conceptSetName", "concepts"],
  }),
  // No execute: the SDK forwards the call to the browser, where the user answers it.
});

/**
 * Pick between concept sets the user ALREADY has.
 *
 * The counterpart to `ui_confirm_concepts`: that one gates writing a new set, this
 * one exists so a new set is not written at all when a suitable one is already
 * there. Two sets named for the same condition rarely mean the same cohort — one
 * may exclude complications, another may be broader — so which one is used changes
 * the clinical result, and that choice is the user's.
 *
 * Also has no `execute`, so the turn parks here until the user answers.
 */
export const CHOOSE_CONCEPT_SET_TOOL = "ui_choose_concept_set";

const chooseConceptSetTool = tool({
  description:
    "Ask the user WHICH existing concept set to use for a clinical term, when `list_concept_sets` returned " +
    "more than one plausible match. Renders the candidates as numbered cards in the assistant panel with " +
    "quick-reply chips, and returns { chosen, conceptSetIds, conceptSetNames }. Call this INSTEAD of guessing " +
    "between near-identical sets and INSTEAD of creating a duplicate. " +
    "`conceptSetIds` may hold ONE set, SEVERAL (the user ticked a subset and wants them combined), or all of " +
    "them — use exactly what comes back, never a superset. `chosen:false` with an empty list means none of " +
    "them fit, so build a new set. The panel supplies its own 'include all' and 'neither fits' choices — do " +
    "not put them in `options`.",
  inputSchema: jsonSchema({
    type: "object",
    properties: {
      term: {
        type: "string",
        description: "The clinical term being disambiguated, e.g. 'Type 2 diabetes'.",
      },
      intro: {
        type: "string",
        description:
          "One short lead-in sentence, e.g. 'Got it. I found a few things to clarify before building your cohort.'",
      },
      filterLabel: {
        type: "string",
        description:
          "Heading for the filters you have already worked out, e.g. 'This is the basic filter:'. Omit when there are none.",
      },
      filterItems: {
        type: "array",
        description: "Those filters, one per line, e.g. ['Gender: Female', 'Age: 60 and above'].",
        items: { type: "string" },
      },
      question: {
        type: "string",
        description:
          "The question itself, e.g. 'For \"Type 2 diabetes\", I found 2 similar concept sets. Which one did you mean?'",
      },
      options: {
        type: "array",
        description:
          "The candidate EXISTING concept sets, in the order they should be numbered. Two to five — a longer list is not reviewable.",
        items: {
          type: "object",
          properties: {
            conceptSetId: { type: "number", description: "Id as returned by list_concept_sets." },
            name: { type: "string", description: "The concept set's name, shown as the card title." },
            note: {
              type: "string",
              description:
                "One short line on how this option differs from the others, e.g. 'More specific — excludes patients with diabetic complications'.",
            },
            shortLabel: {
              type: "string",
              description: "Abbreviated name for the quick-reply chip, e.g. 'T2DM without complications'. Defaults to `name`.",
            },
          },
          required: ["conceptSetId", "name"],
        },
      },
      footer: {
        type: "string",
        description: "Closing line, e.g. 'Reply with 1 or 2, or let me know if neither fits.'",
      },
    },
    required: ["term", "options"],
  }),
  // No execute: answered by the user in the panel.
});

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
    const serverTools = throwOnToolError(
      Object.fromEntries(
        Object.entries(allServerTools).filter(([name]) => COHORT_AGENT_SERVER_TOOLS.has(name)),
      ),
    );
    const browserTools = toClientTools(clientTools);
    // Last, so a page-supplied descriptor can never shadow it — belt and braces over
    // the `pa_` prefix check in toClientTools.
    const tools = {
      ...serverTools,
      ...browserTools,
      [CONFIRM_CONCEPTS_TOOL]: confirmConceptsTool,
      [CHOOSE_CONCEPT_SET_TOOL]: chooseConceptSetTool,
    };
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
