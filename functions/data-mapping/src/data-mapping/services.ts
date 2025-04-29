import { env } from "../env";
import { IUICodeSnippet, LLM_User_Data, DataMappingError } from "../type";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getModelInstance } from "../utils/prepModels";

export const getDataMapping = async (uiCode: IUICodeSnippet) => {
  const instructions = `Map the given JSON object to OMOP CDM v5 format - use the following instructions. 
              1. Map the following table and column names to OMOP CDM v5 table and column names.
              2. For Output, fill the blanks in JSON object provided below.
              3. For non-matches, replace value by -1. Just return json object, nothing else.
              4. Try to match all tables and columns to OMOP CDM format.
              5. The source JSON object is as following.`;

  const model = await getModelInstance(env.AI_MODEL_NAME);

  if (model === "NULL"){
    console.error(`LLM Model - ${env.AI_MODEL_NAME} not found`);
    throw new DataMappingError(`LLM Model - ${env.AI_MODEL_NAME} not found.`,404);
  }
  
  // convert the received JSON data to required format
  const finalLLMData:{ data: LLM_User_Data[] } = {
    data : []
  };

  try{
    const srcTables = JSON.parse(uiCode.data).source_tables;

    for (const srcTable of srcTables){
      const llmData:LLM_User_Data ={
        "source_table": srcTable.table_name,
        "OMOP_table" : "",
        "columns_mapping": {}
      };
      
      const columnList = srcTable.column_list;
      for (const column of columnList){
        llmData.columns_mapping[column.column_name] = "";
      }
      finalLLMData.data.push(llmData);
    }
  }
  catch(error){
    console.error(`Error! Parsing the JSON object - ${error.message}`);
    throw new DataMappingError(error.message, 400); // bad request - bad JSON object
  }
  
  const messages = [
      new SystemMessage(instructions),
      new HumanMessage(JSON.stringify(finalLLMData))
    ];
    
  try {
    const response = await model.invoke(messages);
    const mappedData = response.content;
    return mappedData;
  } 
  catch (error) {
    console.error(`Error! invoking the LLM - ${error.message}`);
    throw new DataMappingError(`Error! invoking the LLM - ${error.message}`, 500);
  }
};
