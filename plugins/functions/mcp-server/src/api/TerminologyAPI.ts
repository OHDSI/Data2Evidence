import { BaseAPI } from "./BaseAPI";

export type ConceptItem = {
  id: number;
  useDescendants: boolean;
  useMapped: boolean;
  isExcluded: boolean;
};

export type ConceptSetSummary = {
  id: number;
  name: string;
  shared: boolean;
  modifiedDate: string;
  createdBy: string;
};

export class TerminologyAPI extends BaseAPI {
  constructor() {
    super("terminology-svc", "terminology");
  }

  // LLM-actionable error mapping. Inspect HTTP status + body to surface
  // specific recovery guidance. Always throws — return type is never.
  private mapError(error: any, nameHint?: string): never {
    const status = error?.response?.status;
    const bodyMessage: string | undefined = error?.response?.data?.message;

    if (
      status === 409 ||
      (bodyMessage &&
        /already exists|duplicate|unique/i.test(bodyMessage) &&
        nameHint)
    ) {
      throw new Error(
        `A concept set named '${nameHint}' already exists in this dataset. Use update_concept_set or pick a different name.`,
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
      // Re-throw prose-looking message from upstream verbatim
      throw new Error(bodyMessage);
    }
    if (status && status >= 500) {
      throw new Error(
        "terminology-svc returned a server error. Retry; if it persists, the service may be down.",
      );
    }
    const msg: string = error?.message ?? "";
    if (error?.code === "ECONNABORTED" || msg.includes("timeout")) {
      throw new Error(
        "Request to terminology-svc timed out. The concept set may be very large — try get_concept_set first to confirm size.",
      );
    }
    throw new Error(
      "Could not reach terminology-svc. The service may be down.",
    );
  }

  async listConceptSets(
    authorization: string,
    datasetId: string,
  ): Promise<ConceptSetSummary[]> {
    try {
      const { data, status } = await this.call<ConceptSetSummary[]>(
        "get",
        `/concept-set?datasetId=${encodeURIComponent(datasetId)}`,
        { authorization },
      );
      if (status !== 200 || !Array.isArray(data)) {
        throw { response: { status } };
      }
      return data;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async getConceptSet(
    authorization: string,
    datasetId: string,
    conceptSetId: number,
  ): Promise<any> {
    try {
      const { data, status } = await this.call<any>(
        "get",
        `/concept-set/${conceptSetId}?datasetId=${encodeURIComponent(datasetId)}`,
        { authorization },
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
      concepts: ConceptItem[];
      shared: boolean;
      userName: string;
    },
  ): Promise<number> {
    try {
      const { data } = await this.call<number>(
        "post",
        `/concept-set?datasetId=${encodeURIComponent(datasetId)}`,
        { authorization },
        payload,
      );
      return data;
    } catch (error) {
      throw this.mapError(error, payload.name);
    }
  }

  async updateConceptSet(
    authorization: string,
    datasetId: string,
    conceptSetId: number,
    payload: Partial<{
      name: string;
      concepts: ConceptItem[];
      shared: boolean;
      userName: string;
    }>,
  ): Promise<number> {
    try {
      const { data } = await this.call<number>(
        "put",
        `/concept-set/${conceptSetId}?datasetId=${encodeURIComponent(datasetId)}`,
        { authorization },
        payload,
      );
      return Number(data);
    } catch (error) {
      throw this.mapError(error, payload.name);
    }
  }

  async deleteConceptSet(
    authorization: string,
    datasetId: string,
    conceptSetId: number,
  ): Promise<number> {
    try {
      const { data } = await this.call<number>(
        "delete",
        `/concept-set/${conceptSetId}?datasetId=${encodeURIComponent(datasetId)}`,
        { authorization },
      );
      return Number(data);
    } catch (error) {
      throw this.mapError(error);
    }
  }
}
