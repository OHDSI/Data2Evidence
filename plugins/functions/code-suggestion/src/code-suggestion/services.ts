import { IUICodeSnippet, IChatSnippet } from "../type";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getModels } from "../utils/utils";
import { createStaticMcpTools } from "../mcp/staticTools";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createAgent } from "langchain";
import { getRolePrompting, getNotebookAgentPrompt } from "./prompts";
import {
  createNotebookEditTools,
  serializeNotebookForPrompt,
  type EditOp,
  type NotebookCellCtx,
} from "./notebookAgent";

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
      }`
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
    const tools = createStaticMcpTools(token, datasetId);
    const agent = createAgent({
      model: model,
      tools: tools,
    });
    console.log(
      `[MCP-TIMING] [code-suggestion] Statictools and Agent created ${(performance.now() - chatStart).toFixed(1)}ms`,
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
      }`
    );
  }
};

export const getNotebookAgentResponse = async (req: any) => {
  const token = req.headers.authorization;
  const datasetId = req.query.datasetId;
  const cells: NotebookCellCtx[] = Array.isArray(req.body.cells)
    ? req.body.cells
    : [];
  const userInput: string = req.body.userInput ?? "";
  const history: { role: string; content: string }[] = Array.isArray(
    req.body.history,
  )
    ? req.body.history
    : [];

  const model = await getModels(req.body.model);
  if (!model || model === "local") {
    throw new Error(
      "Notebook agent requires a cloud model with tool support. Set AI_MODEL to a gpt:/anthropic:/azure:/gemini: model.",
    );
  }

  const edits: EditOp[] = [];
  const editTools = createNotebookEditTools(cells, edits);
  const mcpTools = createStaticMcpTools(token, datasetId);
  const agent = createAgent({ model, tools: [...editTools, ...mcpTools] as any });

  const notebookText = serializeNotebookForPrompt(cells);
  const messages: any[] = [
    new SystemMessage(getNotebookAgentPrompt(userInput, notebookText)),
  ];
  for (const h of history) {
    messages.push(
      h.role === "assistant"
        ? new AIMessage(h.content)
        : new HumanMessage(h.content),
    );
  }
  messages.push(new HumanMessage(userInput));

  const stream: any = await agent.stream(
    { messages },
    { streamMode: "messages" },
  );
  return { stream, edits };
};
