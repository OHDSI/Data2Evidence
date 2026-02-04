import {
  NewFhirProjectInput,
} from "../types";
import { request } from "./request";

const GATEWAY_BASE_URL = "fhir-gateway";

export class FhirGateway {

  public createFhirStaging(input: NewFhirProjectInput): Promise<any> {
    return request({
      baseURL: GATEWAY_BASE_URL,
      url: "/createProject",
      method: "POST",
      data: input,
    });
  }

  public deleteFhirStaging(id: string): Promise<any> {
    return request({
      baseURL: GATEWAY_BASE_URL,
      url: `/deleteProject/${id}`,
      method: "delete",
    });
  }

}
