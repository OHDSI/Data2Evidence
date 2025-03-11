import { IUICodeSnippet } from "../type";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getModels } from "../utils/PrepModels";

export const getCodeSuggestion = async (uiCode: IUICodeSnippet) => {
  const [model, status] = await getModels(uiCode.model);
  if (status === "500") {
    return [model, status];
  }

  try {
    const messages = [
      new SystemMessage(`
                        You are an intelligent code auto-completion tool. The code snippet achieved from role of user:
                        Instructions:
                                1. Your response must begin with the exact code snippet achieved from role of user, without any labels or prefixes.
                                2. Immediately after the given code, without adding a new line, provide a completion for the current line or statement.
                                3. The completion should be a direct continuation of the given code.
                                4. Ensure the completion is syntactically correct and logically coherent.
                                5. Provide a complete and useful code snippet, not just the given code.
                                6. Do not include any explanations, comments, or labels in your response.
                                
                                Complete the code (your response MUST start with and be longer than the given code)
                        `),
      new HumanMessage(uiCode.code),
    ];
    const response = await model.invoke(messages);
    const codeSuggest = response.content;
    return [codeSuggest, "200"];
  } catch (error) {
    return [error, "500"];
  }
};
