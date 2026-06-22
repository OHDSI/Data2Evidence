const DEFAULT_WEBAPI_URL = "http://localhost:33001/WebAPI";

export interface IWebApiConceptSetHeader {
  id: number;
  name: string;
  description?: string | null;
  createdBy?: {
    id?: number;
    login?: string;
    name?: string;
  } | null;
  modifiedBy?: {
    id?: number;
    login?: string;
    name?: string;
  } | null;
  createdDate?: number | null;
  modifiedDate?: number | null;
  writeAccess?: boolean | null;
  readAccess?: boolean | null;
  tags?: unknown[];
}

export interface IWebApiConceptSetItem {
  conceptId: number;
  isExcluded: number;
  includeDescendants: number;
  includeMapped: number;
}

export interface IWebApiConceptSetItemWrite {
  conceptId: number;
  isExcluded: boolean;
  includeDescendants: boolean;
  includeMapped: boolean;
}

export interface IWebApiConcept {
  CONCEPT_ID: number;
  CONCEPT_NAME: string;
  STANDARD_CONCEPT: string | null;
  STANDARD_CONCEPT_CAPTION: string;
  INVALID_REASON: string | null;
  INVALID_REASON_CAPTION: string;
  CONCEPT_CODE: string;
  DOMAIN_ID: string;
  VOCABULARY_ID: string;
  CONCEPT_CLASS_ID: string;
  VALID_START_DATE: string | number;
  VALID_END_DATE: string | number;
}

export interface IWebApiConceptSetExpression {
  items: Array<{
    concept: IWebApiConcept;
    isExcluded: boolean;
    includeDescendants: boolean;
    includeMapped: boolean;
  }>;
}

const buildHeaders = (token: string, contentType?: string) => {
  const headers: Record<string, string> = {
    Authorization: token.toLowerCase().startsWith("bearer ")
      ? token
      : `Bearer ${token}`,
    Accept: "application/json",
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  return headers;
};

const getWebApiBaseUrl = () => {
  try {
    const parsed = JSON.parse(Deno.env.get("SERVICE_ROUTES") ?? "{}");
    return parsed.webapi ?? DEFAULT_WEBAPI_URL;
  } catch {
    return DEFAULT_WEBAPI_URL;
  }
};

export class WebApiConceptSetAPI {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(token: string) {
    if (!token) {
      throw new Error("No token passed for WebApiConceptSetAPI!");
    }

    this.token = token;
    this.baseUrl = getWebApiBaseUrl();
  }

  async getConceptSets(): Promise<IWebApiConceptSetHeader[]> {
    const response = await fetch(`${this.baseUrl}/conceptset/`, {
      method: "GET",
      headers: buildHeaders(this.token),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch WebAPI concept sets: ${response.status}`);
    }

    return response.json();
  }

  async getConceptSet(id: number): Promise<IWebApiConceptSetHeader> {
    const response = await fetch(`${this.baseUrl}/conceptset/${id}`, {
      method: "GET",
      headers: buildHeaders(this.token),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch WebAPI concept set ${id}: ${response.status}`);
    }

    return response.json();
  }

  async getConceptSetExpression(
    id: number,
    sourceKey: string
  ): Promise<IWebApiConceptSetExpression> {
    const response = await fetch(
      `${this.baseUrl}/conceptset/${id}/expression/${encodeURIComponent(sourceKey)}`,
      {
        method: "GET",
        headers: buildHeaders(this.token),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch WebAPI concept set expression ${id}: ${response.status}`
      );
    }

    return response.json();
  }

  async createConceptSet(input: {
    name: string;
    description?: string;
  }): Promise<IWebApiConceptSetHeader> {
    const response = await fetch(`${this.baseUrl}/conceptset/`, {
      method: "POST",
      headers: buildHeaders(this.token, "application/json"),
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Failed to create WebAPI concept set: ${response.status}`);
    }

    const created = await response.json();
    return this.getConceptSet(created.id);
  }

  async updateConceptSet(
    id: number,
    input: { id: number; name: string; description?: string }
  ): Promise<IWebApiConceptSetHeader> {
    const response = await fetch(`${this.baseUrl}/conceptset/${id}`, {
      method: "PUT",
      headers: buildHeaders(this.token, "application/json"),
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Failed to update WebAPI concept set ${id}: ${response.status}`);
    }

    return response.json();
  }

  async updateConceptSetItems(
    id: number,
    items: IWebApiConceptSetItemWrite[]
  ): Promise<boolean> {
    const payload: IWebApiConceptSetItem[] = items.map((item) => ({
      conceptId: item.conceptId,
      isExcluded: item.isExcluded ? 1 : 0,
      includeDescendants: item.includeDescendants ? 1 : 0,
      includeMapped: item.includeMapped ? 1 : 0,
    }));

    const response = await fetch(`${this.baseUrl}/conceptset/${id}/items`, {
      method: "PUT",
      headers: buildHeaders(this.token, "application/json"),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to update WebAPI concept set items ${id}: ${response.status}`
      );
    }

    return response.json();
  }

  async deleteConceptSet(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/conceptset/${id}`, {
      method: "DELETE",
      headers: buildHeaders(this.token),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete WebAPI concept set ${id}: ${response.status}`);
    }
  }

  async checkIfConceptSetExists(id: number, name: string): Promise<number> {
    const url = new URL(`${this.baseUrl}/conceptset/${id}/exists`);
    url.searchParams.set("name", name);

    const response = await fetch(url, {
      method: "GET",
      headers: buildHeaders(this.token),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to check WebAPI concept set existence for ${id}: ${response.status}`
      );
    }

    return response.json();
  }

  async resolveConceptSetExpression(
    sourceKey: string,
    expression: IWebApiConceptSetExpression
  ): Promise<number[]> {
    const response = await fetch(
      `${this.baseUrl}/vocabulary/${encodeURIComponent(sourceKey)}/resolveConceptSetExpression`,
      {
        method: "POST",
        headers: buildHeaders(this.token, "application/json"),
        body: JSON.stringify(expression),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to resolve WebAPI concept set expression for source ${sourceKey}: ${response.status}`
      );
    }

    return response.json();
  }

  async lookupIdentifiers(
    sourceKey: string,
    conceptIds: number[]
  ): Promise<IWebApiConcept[]> {
    const response = await fetch(
      `${this.baseUrl}/vocabulary/${encodeURIComponent(sourceKey)}/lookup/identifiers`,
      {
        method: "POST",
        headers: buildHeaders(this.token, "application/json"),
        body: JSON.stringify(conceptIds),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to lookup WebAPI identifiers for source ${sourceKey}: ${response.status}`
      );
    }

    return response.json();
  }
}
