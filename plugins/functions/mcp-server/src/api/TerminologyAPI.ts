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
      // Re-throw prose-looking message from upstream verbatim
      throw new Error(bodyMessage);
    }
    // A 4xx means the service answered and REJECTED the request — the opposite of
    // unreachable. Falling through to "the service may be down" (below) told the
    // model a deterministic failure was transient: get_concept_set with an id that
    // does not exist 400s, and the model read that as "retry".
    if (status && status >= 400 && status < 500) {
      throw new Error(
        `terminology-svc rejected the request (${status}). The service is up, so retrying it unchanged will ` +
          `fail the same way. For get_concept_set this almost always means the concept set id does not exist ` +
          `in this dataset — use an id returned by list_concept_sets, never a guessed or incremented one.`,
      );
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

  async checkConceptCoverage(
    authorization: string,
    datasetId: string,
    conceptIds: number[],
  ): Promise<{ found: number[]; missing: number[] }> {
    try {
      const { data } = await this.call<{ found: number[]; missing: number[] }>(
        "post",
        "/concept/checkCoverage",
        { authorization },
        { conceptIds, datasetId },
      );
      return data;
    } catch (error) {
      throw this.mapError(error);
    }
  }
}
