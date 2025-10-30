import { ScannedSchemaState } from "../contexts";
import { ISuggestResponse } from "../types/suggestMapping";
import request from "./request";
import { API_PATHS } from "../constants/api";

const BASE_URL = API_PATHS.DATA_MAPPING;

export class DataMapping {
  public getSuggestedMapping(schema?: ScannedSchemaState) {
    return request<ISuggestResponse>({
      url: BASE_URL,
      method: "POST",
      data: schema,
    });
  }
}
