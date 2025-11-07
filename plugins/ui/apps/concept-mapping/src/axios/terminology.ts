import { FilterOptions, RowObject, StandardConcepts } from "../types";
import { request } from "./request";

const TERMINOLOGY_BASE_URL = "terminology";

export class Terminology {
  public async getAllFilterOptions(datasetId: string): Promise<{ filterOptions: FilterOptions }> {
    return request({
      baseURL: TERMINOLOGY_BASE_URL,
      method: "GET",
      url: `/concept/filter-options`,
      params: {
        datasetId: datasetId,
        searchText: "",
        filter: JSON.stringify({}),
      },
    });
  }

  public getStandardConcepts(data: RowObject[], datasetId: string): Promise<StandardConcepts[]> {
    return request({
      baseURL: TERMINOLOGY_BASE_URL,
      url: `/concept/getStandardConcepts`,
      method: "POST",
      data: { data, datasetId },
    });
  }
}
