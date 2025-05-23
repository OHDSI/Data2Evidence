import { IUICodeSnippet, IChatSnippet } from "../type";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getModels, getModelsChat } from "../utils/prepModels";
import { StringOutputParser } from "@langchain/core/output_parsers";

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

  const query =
    context +
    `Here is the code snippet achieved from role of user: '${uiCode.code}'`;

  const [model, status] = await getModels(uiCode.model);

  if (status === "501") {
    return [[model, query], status];
  }

  if (status === "201") {
    return [query, status];
  }

  try {
    const messages = [
      new SystemMessage(context),
      new HumanMessage(uiCode.code),
    ];
    const response = await model.invoke(messages);
    const codeSuggest = response.content;
    return [codeSuggest, "200"];
  } catch (error) {
    return [error, "500"];
  }
};

export const getChatResponse = async (uiChat: IChatSnippet) => {
  const model = await getModelsChat(uiChat.model);

  if (model === null) {
    throw Error(`LLM Model - ${uiChat.model} not found.`);
  }

  try {
    const rolePrompting = `You are an experienced professional in the medical research field, with exceptional expertise in coding and analyzing healthcare data. Your background combines deep knowledge of clinical concepts, medical terminologies, and research methodologies with advanced programming skills. We value our users and our goal is to solve the coding problems for them. When you deal with the user question, the [context_code] here must be considered.
      [context_code]: ${uiChat.context}
      Instructions:
      step 1: Analyze the relation between the user question and the [context_code]
      step 2: If the user question is not related to the [context_code], please inform the user and still provide an accurate response to the user question. You could ask for more information if needed.
      step 3: If the user question is realted to the [context_code]. Provide an accurate response to the user question, ensuring that it is relevant to the [context_code]
      step 4: If the user question is not clear, before your reply in details you should ask for more information.
      `;

    const messages = [
      new SystemMessage(rolePrompting),
      new HumanMessage(uiChat.userInput),
    ];
    // streaming
    const outputParser = new StringOutputParser();
    const streamingChain = model.pipe(outputParser);
    const stream = await streamingChain.stream(messages);
    return stream;
  } catch (error) {
    throw error;
  }
};
