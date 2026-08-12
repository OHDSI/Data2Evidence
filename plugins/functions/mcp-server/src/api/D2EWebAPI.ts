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

/**
 * The concept set row was created, but attaching its concepts failed — so an
 * EMPTY set is now saved under `ref`.
 *
 * Distinct from a failed create, and the distinction is the whole point: reporting
 * "nothing was saved" would leave a real, empty set behind, and a cohort later
 * filtered on it returns zero patients while looking perfectly valid.
 */
export class ConceptSetItemsNotSavedError extends Error {
  constructor(
    readonly ref: string,
    readonly conceptSetName: string,
    readonly reason: string,
  ) {
    super(
      `Concept set '${conceptSetName}' was created as ref ${ref}, but its concepts ` +
        `could NOT be saved, so it is EMPTY. ${reason}`,
    );
    this.name = "ConceptSetItemsNotSavedError";
  }
}

export class D2EWebAPI extends BaseAPI {
  constructor() {
    super("d2e-webapi", "d2e-webapi");
  }

  /** The human-readable reason a call failed, without throwing it. */
  private describeError(error: any, nameHint?: string): string {
    const status = error?.response?.status;
    const bodyMessage: string | undefined = error?.response?.data?.message;

    if (
      nameHint &&
      (status === 409 ||
        (bodyMessage && /already exists|duplicate|unique/i.test(bodyMessage)))
    ) {
      return `A concept set named '${nameHint}' already exists in this dataset. Pick a different name.`;
    }
    if (status === 404) {
      return "Concept set not found. It may have been deleted.";
    }
    if (
      bodyMessage &&
      bodyMessage.length < 200 &&
      /[A-Z]/.test(bodyMessage[0])
    ) {
      return bodyMessage;
    }
    if (status && status >= 500) {
      return "d2e-webapi returned a server error. Retry; if it persists, the service may be down.";
    }
    const msg: string = error?.message ?? "";
    if (error?.code === "ECONNABORTED" || msg.includes("timeout")) {
      return "Request to d2e-webapi timed out. The concept set may be very large — try get_concept_set first to confirm size.";
    }
    return "Could not reach d2e-webapi. The service may be down.";
  }

  private mapError(error: any, nameHint?: string): never {
    throw new Error(this.describeError(error, nameHint));
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
    // Creating the row and attaching its concepts are two calls, so they fail
    // differently and must be reported differently — see ConceptSetItemsNotSavedError.
    let created: { id: string; externalId: number; source: string };
    try {
      const createPayload = {
        name: payload.name,
        description: payload.description,
        shared: payload.shared,
      };
      const { data } = await this.call<any>(
        "post",
        "/conceptset",
        { authorization, datasetId },
        createPayload,
      );
      created = data;
    } catch (error) {
      throw this.mapError(error, payload.name);
    }

    if (payload.items && payload.items.length > 0) {
      try {
        await this.call<any>(
          "put",
          `/conceptset/${encodeURIComponent(created.id)}/items`,
          { authorization, datasetId },
          payload.items,
        );
      } catch (error) {
        throw new ConceptSetItemsNotSavedError(
          created.id,
          payload.name,
          this.describeError(error, payload.name),
        );
      }
    }

    return created;
  }
}
