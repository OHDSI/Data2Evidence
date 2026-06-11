import { request } from "./request";

const GATEWAY_BASE_URL = "fhir-gateway";

export class FhirGateway {
  public deleteFhirDataset(id: string): Promise<any> {
    return request({
      baseURL: GATEWAY_BASE_URL,
      url: `/deleteDataset/${id}`,
      method: "delete",
    });
  }
}
