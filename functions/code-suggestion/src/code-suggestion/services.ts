import { IUICodeSnippet, IChatSnippet } from "../type";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getModels, initMcpManager } from "../utils/utils";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createAgent } from "langchain";
import { getRolePrompting } from "./prompts";

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
    throw error;
  }
};

export const getChatResponse = async (req: any) => {
  const uiChat: IChatSnippet = req.body;
  const token = req.headers.authorization;
  const datasetId = req.headers.datasetId;
  const model = await getModels(uiChat.model);
  if (model === null) {
    throw Error(`LLM Model - ${uiChat.model} not found.`);
  }

  // Initialize MCP if requested and available
  try {
    const mcpInstance = await initMcpManager(token, datasetId);
    console.log("MCP Client connected:", mcpInstance.getConnectionStatus());
    const client = mcpInstance.getUnderlyingClient();
    const tools = await client.getTools();
    const agent = createAgent({
      model: model,
      tools: tools,
    });

    // prompt parameter in createAgent doesn't work as expected - the system message needs to be in the messages array
    const messages = [
      new SystemMessage(getRolePrompting(uiChat.userInput, uiChat.context)),
      new HumanMessage(uiChat.userInput),
    ];

    // Use agent to handle the conversation with tools
    if (agent) {
      const stream = await agent.stream(
        { messages: messages },
        { streamMode: "messages" }
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
    throw error;
  }
};
