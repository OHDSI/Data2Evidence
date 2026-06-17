import { IUICodeSnippet, IChatSnippet } from "../type";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { getModels } from "../utils/utils";
import { createMcpClient } from "../mcp/client";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createAgent } from "langchain";
import { getRolePrompting, getCohortPrompting } from "./prompts";

// The tool that returns the final deep link.
const COHORT_BUILDER_TOOL = "build_d2e_cohort_deeplink";
// The toolset the cohort agent may call: discover filters, resolve clinical
// terms to concept-set ids (concept search + phenotype library + concept-set
// management), then build. Excludes the ATLAS/strategus cohort-definition tools.
const COHORT_AGENT_TOOLS = new Set<string>([
  "list_cohort_filters",
  "search_concepts",
  "search_phenotype_library",
  "fetch_templates_for_cohort_generation",
  "check_concept_coverage_in_dataset",
  "list_concept_sets",
  "get_concept_set",
  "create_concept_set",
  COHORT_BUILDER_TOOL,
]);
// The deep-link path the tool returns; captured deterministically so the LLM
// never has to relay the (long, easily-placeholdered) URL itself. The optional
// /d2e prefix must be kept (the tool emits /d2e/portal/...); anchoring at
// /portal here is what was silently stripping it.
const COHORT_URL_RE = /(?:\/d2e)?\/portal\/researcher\/cohort\?[^\s")']+/;

/** Pull the deep-link URL out of whatever shape the tool result arrives in. */
function extractCohortUrl(toolResult: unknown): string | undefined {
  let text: string;
  if (typeof toolResult === "string") {
    text = toolResult;
  } else if (typeof (toolResult as any)?.content === "string") {
    text = (toolResult as any).content;
  } else {
    text = JSON.stringify(toolResult ?? "");
  }
  const match = text.match(COHORT_URL_RE);
  return match ? match[0] : undefined;
}

export const getCodeSuggestion = async (uiCode: IUICodeSnippet) => {
  const context = `
  You are an intelligent code auto-completion tool.
  Instructions:
          1. Your response must begin with the exact code snippet achieved from role of user, without any labels or prefixes.
          2. Immediately after the given code, without adding a new line, provide a completion for the current line or statement.
          3. The completion should be a direct continuation of the given code.
          4. Ensure the completion is syntactically correct and logically coherent.
          5. Provide a complete and useful code snippet, not just the given code.
          6. Do not include any explanations, comments, or labels in your response.

          Complete the code (your response MUST start with and be longer than the given code)
  `;

  const model = await getModels(uiCode.model);
  if (model === null) {
    throw Error(`LLM Model - ${uiCode.model} not found.`);
  }
  if (model === "local") {
    const query =
      context +
      `Here is the code snippet achieved from role of user: '${uiCode.code}'`;
    // Calling local model
    const stream = await Trex.ask(query, {
      repo: "QuantFactory/Dolphin3.0-Llama3.2-1B-GGUF",
      model: "Dolphin3.0-Llama3.2-1B.Q4_K_M.gguf",
    });
    const reader = stream.getReader();
    return reader;
  }

  try {
    const messages = [
      new SystemMessage(context),
      new HumanMessage(uiCode.code),
    ];
    const response = await model.invoke(messages);
    const codeSuggest = response.content;
    return codeSuggest;
  } catch (error) {
    console.error("Error generating code suggestion:", error);
    throw new Error(
      `Failed to generate code suggestion with model ${uiCode.model}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

export const getChatResponse = async (req: any) => {
  const uiChat: IChatSnippet = req.body;
  const token = req.headers.authorization;
  const datasetId = req.query.datasetId; // datasetId is passed as a query parameter
  const model = await getModels(uiChat.model);

  try {
    const chatStart = performance.now();
    const mcpClient = createMcpClient(token, datasetId);
    const tools = await mcpClient.getTools();
    const agent = createAgent({
      model: model,
      tools: tools,
    });
    console.log(
      `[MCP-TIMING] [code-suggestion] MCP tools and Agent created ${(performance.now() - chatStart).toFixed(1)}ms`,
    );
    // prompt parameter in createAgent doesn't work as expected - the system message needs to be in the messages array
    const messages = [
      new SystemMessage(getRolePrompting(uiChat.userInput, uiChat.context)),
      new HumanMessage(uiChat.userInput),
    ];

    // Use agent to handle the conversation with tools
    if (agent) {
      const streamStart = performance.now();
      const stream = await agent.stream(
        { messages: messages },
        { streamMode: "messages" },
      );
      console.log(
        `[MCP-TIMING] [code-suggestion] agent.stream() initiated in ${(performance.now() - streamStart).toFixed(1)}ms`,
      );
      return stream;
    } else {
      console.log("Agent not available, using direct model invocation.");
      // Fallback to direct model invocation if agent is not available
      const outputParser = new StringOutputParser();
      const streamingChain = model.pipe(outputParser);
      const stream = await streamingChain.stream(messages);
      return stream;
    }
  } catch (error) {
    console.error("Error in getChatResponse:", error);
    throw new Error(
      `Failed to get chat response with model ${uiChat.model}${datasetId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

/**
 * Cohort builder chat: a separate single-tool agent that turns a natural
 * language age/gender description into a PA cohort deep link.
 *
 * Mirrors getChatResponse's streaming plumbing, but (1) filters the MCP tools
 * down to just build_d2e_cohort_deeplink so the narrow job calls reliably, and
 * (2) uses the dedicated cohort system prompt. See DATA-2305 design, Piece 2.
 */
export const getCohortResponse = async (req: any) => {
  const uiChat: IChatSnippet = req.body;
  const token = req.headers.authorization;
  const datasetId = req.query.datasetId; // datasetId is passed as a query parameter
  const model = await getModels(uiChat.model);

  try {
    const chatStart = performance.now();
    const mcpClient = createMcpClient(token, datasetId);
    const allTools = await mcpClient.getTools();
    // Multi-tool cohort agent: discover filters, resolve concepts to concept-set
    // ids, then build. Scope to the cohort-building toolset (not the ATLAS /
    // strategus tools) so the agent stays on-task.
    const tools = allTools.filter((t: any) => COHORT_AGENT_TOOLS.has(t.name));
    const buildTool = tools.find((t: any) => t.name === COHORT_BUILDER_TOOL);
    if (!buildTool) {
      throw new Error(
        `Cohort builder tool '${COHORT_BUILDER_TOOL}' not found on the MCP server`,
      );
    }

    // Intercept the build tool at its invoke boundary so we capture the REAL URL
    // it returned, regardless of how the model later phrases (or mangles) it.
    // linkRef is filled while the route consumes the stream (when the agent
    // actually calls the tool); the route reads it after the stream ends.
    const linkRef: { url: string; attempted: boolean } = {
      url: "",
      attempted: false,
    };
    // get_concept_set is used by the guard below to verify persisted ids.
    const getConceptSetTool = tools.find(
      (t: any) => t.name === "get_concept_set",
    );
    const originalInvoke = buildTool.invoke.bind(buildTool);
    buildTool.invoke = async (input: any, config: any) => {
      linkRef.attempted = true;

      // Safety guard: before building, verify every conceptSetId in the clauses
      // is a real persisted concept set (portal.user_artifact row).  This catches
      // the class of bug where the LLM passes a phenotype/library id (e.g. 503)
      // or a raw OMOP concept id instead of a create_concept_set-returned id.
      if (getConceptSetTool) {
        const clauses: Array<{ conceptSetId?: number }> = Array.isArray(
          input?.clauses,
        )
          ? input.clauses
          : [];
        const uniqueIds = [
          ...new Set(
            clauses
              .map((c) => c.conceptSetId)
              .filter((id): id is number => id != null),
          ),
        ];

        const invalid: number[] = [];
        await Promise.all(
          uniqueIds.map(async (id) => {
            // 0 (and any non-positive / non-integer id) is the "unset" sentinel
            // and is never a real persisted concept set — reject it without a
            // round-trip.
            if (!Number.isInteger(id) || id <= 0) {
              invalid.push(id);
              return;
            }
            try {
              const res: any = await getConceptSetTool.invoke(
                { conceptSetId: id },
                config,
              );
              // MCP tool failures may surface as an isError result (or error
              // text) instead of a thrown exception depending on the adapter,
              // so inspect the return value too.
              const text =
                typeof res === "string" ? res : JSON.stringify(res ?? "");
              if (res?.isError === true || /not found/i.test(text)) {
                invalid.push(id);
              }
            } catch {
              invalid.push(id);
            }
          }),
        );

        if (invalid.length > 0) {
          throw new Error(
            `conceptSetId(s) [${invalid.join(", ")}] are not persisted concept sets ` +
              `and cannot be used in a cohort deep link. ` +
              `Do NOT use phenotype/library ids or raw OMOP concept ids as conceptSetId. ` +
              `For each invalid id, call create_concept_set with the OMOP concept ids ` +
              `for that condition/drug/measurement, then use the id returned by ` +
              `create_concept_set in your clause.`,
          );
        }
      }

      const out = await originalInvoke(input, config);
      const url = extractCohortUrl(out);
      if (url) linkRef.url = url;
      return out;
    };

    const agent = createAgent({
      model: model,
      tools: tools,
    });
    console.log(
      `[MCP-TIMING] [cohort-builder] MCP tools and Agent created ${(performance.now() - chatStart).toFixed(1)}ms`,
    );
    // Map prior conversation turns to LangChain message objects so the agent
    // has full multi-turn context (oldest first, capped at 20 turns to bound
    // token/payload size).
    const MAX_HISTORY = 20;
    const historyMessages = (uiChat.history ?? [])
      .slice(-MAX_HISTORY)
      .filter((m) => m.content?.trim())
      .map((m) =>
        m.role === "assistant"
          ? new AIMessage(m.content)
          : new HumanMessage(m.content),
      );

    const messages = [
      new SystemMessage(getCohortPrompting()),
      ...historyMessages,
      new HumanMessage(uiChat.userInput),
    ];

    const streamStart = performance.now();
    const stream = await agent.stream(
      { messages: messages },
      { streamMode: "messages" },
    );
    console.log(
      `[MCP-TIMING] [cohort-builder] agent.stream() initiated in ${(performance.now() - streamStart).toFixed(1)}ms`,
    );
    return { stream, linkRef };
  } catch (error) {
    console.error("Error in getCohortResponse:", error);
    throw new Error(
      `Failed to get cohort response with model ${uiChat.model}${datasetId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};
