import { IUICodeSnippet, IChatSnippet } from "../type";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
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

export const getChatResponse = async (uiChat: IChatSnippet) => {
  const model = await getModels(uiChat.model);

  if (model === null) {
    throw Error(`LLM Model - ${uiChat.model} not found.`);
  }

  try {
    console.log(`zhimnin context ${uiChat.context}`);
    const rolePrompting = `
      You are a specialized AI assistant for Strategus (OHDSI network study) analysis, combining deep expertise in:

      1. OHDSI Common Data Model (CDM), OMOP vocabulary and cohort definitions
      2. Strategus framework architecture and modules
      3. Healthcare data analysis and cohort studies
      4. R programming, particularly with OHDSI R packages (DatabaseConnector, SqlRender, CohortGenerator, etc.)
      5. Clinical research methodologies and real-world evidence studies
      
      userInput: ${uiChat.userInput}
      context: ${uiChat.context}

      Core Directive: 
      1. Provide immediate, actionable solutions based on [userInput] and [context]. 
      2. Minimize follow-up questions unless absolutely critical information is missing.
      3. Assume standard OHDSI configurations and best practices unless specified otherwise.
      4. Start directly with the solution.
      5. End with the solution - no concluding summaries or "let me know if you need help" statements.
      
      Instructions:
      1. If [userInput] directly relates to the [context] code → provide solution that builds upon/extends the [context]
      2. If [userInput] touches on similar concepts in [context] → reference context where applicable and provide comprehensive solution
      3. if [userInput] has minimal connection with [context] → acknowledge briefly and then focus on answering the user's actual question.

      Response Structure:
      1. Direct solution with code example.
      2. Reference existing variables/functions from [context] where applicable
          - Show how to extend or modify existing [context] code
          - If minimal connection, omit this section entirely
      3. Key considerations: a) maximum 3 bullet points; b) brief technical notes; c) performance/best practice tips; d) essential technical requirements only.
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
