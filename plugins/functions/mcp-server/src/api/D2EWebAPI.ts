import { BaseAPI } from "./BaseAPI";

export type ConceptSetItem = {
  conceptId: number;
  includeDescendants: boolean;
  includeMapped: boolean;
  isExcluded: boolean;
};

export type ConceptSetSummary = {
  id: string;
  externalId: number;
  source: "legacy" | "webapi";
  name: string;
  shared: boolean;
  modifiedDate: string | number;
  createdBy: { name: string; id?: number; login?: string };
};

export class D2EWebAPI extends BaseAPI {
  constructor() {
    super("d2e-webapi", "d2e-webapi");
  }

  private mapError(error: any, nameHint?: string): never {
    const status = error?.response?.status;
    const bodyMessage: string | undefined = error?.response?.data?.message;

    if (
      nameHint &&
      (status === 409 ||
        (bodyMessage && /already exists|duplicate|unique/i.test(bodyMessage)))
    ) {
      throw new Error(
        `A concept set named '${nameHint}' already exists in this dataset. Pick a different name.`,
      );
    }
    if (status === 404) {
      throw new Error("Concept set not found. It may have been deleted.");
    }
    if (
      bodyMessage &&
      bodyMessage.length < 200 &&
      /[A-Z]/.test(bodyMessage[0])
    ) {
      throw new Error(bodyMessage);
    }
    if (status && status >= 500) {
      throw new Error(
        "d2e-webapi returned a server error. Retry; if it persists, the service may be down.",
      );
    }
    const msg: string = error?.message ?? "";
    if (error?.code === "ECONNABORTED" || msg.includes("timeout")) {
      throw new Error(
        "Request to d2e-webapi timed out. The concept set may be very large — try get_concept_set first to confirm size.",
      );
    }
    throw new Error("Could not reach d2e-webapi. The service may be down.");
  }

  async listConceptSets(
    authorization: string,
    datasetId: string,
  ): Promise<ConceptSetSummary[]> {
    try {
      const { data, status } = await this.call<ConceptSetSummary[]>(
        "get",
        "/conceptset",
        { authorization, datasetId },
      );
      if (status !== 200 || !Array.isArray(data)) {
        throw { response: { status: status === 200 ? 502 : status } };
      }
      return data;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async getConceptSet(
    authorization: string,
    datasetId: string,
    conceptSetRef: string,
  ): Promise<any> {
    try {
      const { data, status } = await this.call<any>(
        "get",
        `/conceptset/${encodeURIComponent(conceptSetRef)}`,
        { authorization, datasetId },
      );
      if (status !== 200 || !data) {
        throw { response: { status: status === 200 ? 404 : status } };
      }
      return data;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async getConceptSetExpression(
    authorization: string,
    datasetId: string,
    conceptSetRef: string,
  ): Promise<{ items: any[] }> {
    try {
      const { data, status } = await this.call<{ items: any[] }>(
        "get",
        `/conceptset/${encodeURIComponent(conceptSetRef)}/expression`,
        { authorization, datasetId },
      );
      if (status !== 200 || !data) {
        throw { response: { status: status === 200 ? 404 : status } };
      }
      return data;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async createConceptSet(
    authorization: string,
    datasetId: string,
    payload: {
      name: string;
      description?: string;
      shared?: boolean;
      items?: ConceptSetItem[];
    },
  ): Promise<{ id: string; externalId: number; source: string }> {
    try {
      const createPayload = {
        name: payload.name,
        description: payload.description,
        shared: payload.shared,
      };
      const { data: created } = await this.call<any>(
        "post",
        "/conceptset",
        { authorization, datasetId },
        createPayload,
      );

      if (payload.items && payload.items.length > 0) {
        await this.call<any>(
          "put",
          `/conceptset/${encodeURIComponent(created.id)}/items`,
          { authorization, datasetId },
          payload.items,
        );
      }

      return created;
    } catch (error) {
      throw this.mapError(error, payload.name);
    }
  }
}
