export interface IUICodeSnippet {
  // code: string;
  model: string;
  data: string;
};
// this type defines a json object format used to communicate with LLM
export type LLM_User_Data = {
        "source_table": any,
        "OMOP_table" : any,
        "columns_mapping": {}
      };
