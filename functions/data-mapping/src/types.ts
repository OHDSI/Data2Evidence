export interface IUICodeSnippet {
  model: string;
  data: string;
};
// this type defines a json object format used to communicate with LLM
export type LLM_User_Data = {
  "source_table": any,
  "OMOP_table" : any,
  "columns_mapping": {}
};

export class DataMappingError extends Error {
  code: number;

  constructor(message: string, code: number) {
    super(message);         // call Error constructor
    this.code = code;        // add custom code
    this.name = "DataMappingError"; // optional
  }
};
