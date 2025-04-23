import { IUICodeSnippet } from "../type";
// import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getModels } from "../utils/prepModels";

export const getDataMapping = async (uiCode: IUICodeSnippet) => {
  console.log("[amit_log] uiCode Value: ", uiCode);
  const context = {
  "role": "user",
  "content": `Map the given JSON object to OMOP CDM v5 format - use the following instructions. 
              1. Map the following table and column names to OMOP CDM v5 table and column names.
              2. For Output, fill the blanks in JSON object provided below.
              3. For non-matches, replace value by -1. Just return json object, nothing else.
              4. Try to match all tables and columns to OMOP CDM format.
              5. The source JSON object is - ${uiCode.data}`
  };
  const [model, status] = await getModels(uiCode.model);
  console.log("[amit_log] model: ", model);
  console.log("[amit_log] status: ", status);
  
  try {
    const messages = [context];
    // const messages = [
    //   new SystemMessage(context),
    //   new HumanMessage(uiCode.data),
    // ];
    console.log("[amit_log] message send to LLM : ", messages);

    const response = await model.invoke(messages);
    
    console.log("[amit_log] LLM Response : ", response.content);
    const mappedData = response.content;
    return [mappedData, "200"];
  } 
  catch (error) {
    return [error, "500"];
  }
};
