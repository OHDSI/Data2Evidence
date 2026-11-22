import { request } from "./request";

const PORTAL_BASE_URL = "system-portal";

export interface PortalDataset {
  id: string;
  type?: string;
  fhirDatasetId?: string | null;
}

export class Portal {
  /** Fetch a dataset so callers can branch on its type. */
  public getDataset(datasetId: string): Promise<PortalDataset> {
    const params = new URLSearchParams();
    params.append("datasetId", datasetId);

    return request({
      baseURL: PORTAL_BASE_URL,
      url: `/dataset?${params}`,
      method: "GET",
    });
  }
}
