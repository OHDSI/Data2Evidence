import { IUICodeSnippet, ChatSnippet } from "../type";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from "@langchain/core/messages";
import { getModels } from "../utils/prepModels";
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

export const getChatResponse = async (uiChat: ChatSnippet) => {
  const [model, status] = await getModels(uiChat.model);

  if (status === "501") {
    return [[model, uiChat.userInput], status];
  }

  if (status === "201") {
    return [uiChat.userInput, status];
  }

  try {
    const rolePrompting =
      "You are an experienced professional in the medical research field, with exceptional expertise in coding and analyzing healthcare data. Your background combines deep knowledge of clinical concepts, medical terminologies, and research methodologies with advanced programming skills. We value our users and our goal is to solve the coding problems for them.";

    // chat history: sys;human(code);AI;human;AI....
    // // system messsage
    // const messages = [
    //   new SystemMessage(rolePrompting),
    //   new HumanMessage(uiChat.userInput),
    // ];

    // // chat history
    // JSON.parse(uiChat.chatHistory).forEach((message) => {
    //   if (message.role === "user") {
    //     messages.push(new HumanMessage(message.content));
    //   } else if (message.role === "assistant") {
    //     messages.push(new AIMessage(message.content));
    //   }
    // });

    // // new user input
    // messages.push(HumanMessage(uiChat.userInput));

    const messages = [
      new SystemMessage(rolePrompting),
      new HumanMessage(uiChat.userInput),
    ];
    // streaming
    const outputParser = new StringOutputParser();
    const streamingChain = model.pipe(outputParser);
    const stream = await streamingChain.stream(messages);
    return [stream, "200"];
  } catch (error) {
    return [error, "500"];
  }
};
