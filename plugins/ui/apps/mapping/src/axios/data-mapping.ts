import { ScannedSchemaState } from "../contexts";
import { ISuggestResponse } from "../types/suggestMapping";
import request from "./request";

const BASE_URL = "data-mapping/";

export class DataMapping {
  public getSuggestedMapping(schema?: ScannedSchemaState) {
    return request<ISuggestResponse>({
      url: BASE_URL,
      method: "POST",
      data: schema,
    });
  }
}
