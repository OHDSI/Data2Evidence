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

const SOURCE_KEY_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
const CONTROL_CHAR_REGEX = /[\x00-\x1F\x7F]/;

const assertPositiveInteger = (value: unknown, field: string): number => {
  if (
    typeof value !== "number" || !Number.isInteger(value) || value <= 0 ||
    value > Number.MAX_SAFE_INTEGER
  ) {
    throw new Error(`Invalid ${field}: expected positive integer`);
  }
  return value;
};

const assertSourceKey = (value: string): string => {
  if (typeof value !== "string" || !SOURCE_KEY_REGEX.test(value)) {
    throw new Error(`Invalid sourceKey: ${value}`);
  }
  return value;
};

const assertName = (value: string): string => {
  if (typeof value !== "string" || value.length === 0 || value.length > 255) {
    throw new Error("Invalid concept set name");
  }
  if (CONTROL_CHAR_REGEX.test(value)) {
    throw new Error("Invalid concept set name: control characters not allowed");
  }
  return value;
};

const assertOptionalDescription = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string" || value.length > 2000) {
    throw new Error("Invalid concept set description");
  }
  if (CONTROL_CHAR_REGEX.test(value)) {
    throw new Error(
      "Invalid concept set description: control characters not allowed",
    );
  }
  return value;
};

const assertConceptIds = (values: number[]): number[] => {
  if (!Array.isArray(values)) {
    throw new Error("Invalid conceptIds: expected array");
  }
  return values.map((id) => assertPositiveInteger(id, "conceptId"));
};

const buildUrl = (baseUrl: string, ...segments: (string | number)[]): URL => {
  const normalizedBase = baseUrl.replace(/\/?$/, "/");
  const path = segments
    .map((segment) => encodeURIComponent(String(segment)))
    .join("/");
  return new URL(path, normalizedBase);
};

const getWebApiBaseUrl = (): string => {
  try {
    const parsed = JSON.parse(Deno.env.get("SERVICE_ROUTES") ?? "{}");
    return parsed.webapi ?? DEFAULT_WEBAPI_URL;
  } catch {
    return DEFAULT_WEBAPI_URL;
  }
};

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

export class WebApiConceptSetAPI {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(token: string) {
    if (!token) {
      throw new Error("No token passed for WebApiConceptSetAPI!");
    }

    this.token = token;

    const baseUrl = getWebApiBaseUrl();
    let parsed: URL;
    try {
      parsed = new URL(baseUrl);
    } catch {
      throw new Error(`Invalid WebAPI base URL: ${baseUrl}`);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`Invalid WebAPI base URL protocol: ${parsed.protocol}`);
    }
    this.baseUrl = baseUrl;
  }

  async getConceptSets(): Promise<IWebApiConceptSetHeader[]> {
    const response = await fetch(buildUrl(this.baseUrl, "conceptset", ""), {
      method: "GET",
      headers: buildHeaders(this.token),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch WebAPI concept sets: ${response.status}`,
      );
    }

    return response.json();
  }

  async getConceptSet(id: number): Promise<IWebApiConceptSetHeader> {
    const validatedId = assertPositiveInteger(id, "id");

    const response = await fetch(
      buildUrl(this.baseUrl, "conceptset", validatedId),
      {
        method: "GET",
        headers: buildHeaders(this.token),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch WebAPI concept set ${validatedId}: ${response.status}`,
      );
    }

    return response.json();
  }

  async getConceptSetExpression(
    id: number,
    sourceKey: string,
  ): Promise<IWebApiConceptSetExpression> {
    const validatedId = assertPositiveInteger(id, "id");
    const validatedSourceKey = assertSourceKey(sourceKey);

    const response = await fetch(
      buildUrl(
        this.baseUrl,
        "conceptset",
        validatedId,
        "expression",
        validatedSourceKey,
      ),
      {
        method: "GET",
        headers: buildHeaders(this.token),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch WebAPI concept set expression ${validatedId}: ${response.status}`,
      );
    }

    return response.json();
  }

  async createConceptSet(input: {
    name: string;
    description?: string;
  }): Promise<IWebApiConceptSetHeader> {
    const payload = {
      name: assertName(input.name),
      description: assertOptionalDescription(input.description),
    };

    const response = await fetch(buildUrl(this.baseUrl, "conceptset", ""), {
      method: "POST",
      headers: buildHeaders(this.token, "application/json"),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to create WebAPI concept set: ${response.status}`,
      );
    }

    const created = await response.json();
    return this.getConceptSet(created.id);
  }

  async updateConceptSet(
    id: number,
    input: { id: number; name: string; description?: string },
  ): Promise<IWebApiConceptSetHeader> {
    const validatedId = assertPositiveInteger(id, "id");
    const inputId = assertPositiveInteger(input.id, "input.id");
    if (inputId !== validatedId) {
      throw new Error("Concept set id mismatch");
    }

    const payload = {
      id: validatedId,
      name: assertName(input.name),
      description: assertOptionalDescription(input.description),
    };

    const response = await fetch(
      buildUrl(this.baseUrl, "conceptset", validatedId),
      {
        method: "PUT",
        headers: buildHeaders(this.token, "application/json"),
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to update WebAPI concept set ${validatedId}: ${response.status}`,
      );
    }

    return response.json();
  }

  async updateConceptSetItems(
    id: number,
    items: IWebApiConceptSetItemWrite[],
  ): Promise<boolean> {
    const validatedId = assertPositiveInteger(id, "id");

    const payload: IWebApiConceptSetItem[] = items.map((item) => {
      assertPositiveInteger(item.conceptId, "conceptId");
      return {
        conceptId: item.conceptId,
        isExcluded: item.isExcluded ? 1 : 0,
        includeDescendants: item.includeDescendants ? 1 : 0,
        includeMapped: item.includeMapped ? 1 : 0,
      };
    });

    const response = await fetch(
      buildUrl(this.baseUrl, "conceptset", validatedId, "items"),
      {
        method: "PUT",
        headers: buildHeaders(this.token, "application/json"),
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to update WebAPI concept set items ${validatedId}: ${response.status}`,
      );
    }

    return response.json();
  }

  async deleteConceptSet(id: number): Promise<void> {
    const validatedId = assertPositiveInteger(id, "id");

    const response = await fetch(
      buildUrl(this.baseUrl, "conceptset", validatedId),
      {
        method: "DELETE",
        headers: buildHeaders(this.token),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to delete WebAPI concept set ${validatedId}: ${response.status}`,
      );
    }
  }

  async checkIfConceptSetExists(id: number, name: string): Promise<number> {
    const validatedId = assertPositiveInteger(id, "id");
    const validatedName = assertName(name);

    const url = buildUrl(this.baseUrl, "conceptset", validatedId, "exists");
    url.searchParams.set("name", validatedName);

    const response = await fetch(url, {
      method: "GET",
      headers: buildHeaders(this.token),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to check WebAPI concept set existence for ${validatedId}: ${response.status}`,
      );
    }

    return response.json();
  }

  async resolveConceptSetExpression(
    sourceKey: string,
    expression: IWebApiConceptSetExpression,
  ): Promise<number[]> {
    const validatedSourceKey = assertSourceKey(sourceKey);

    const response = await fetch(
      buildUrl(
        this.baseUrl,
        "vocabulary",
        validatedSourceKey,
        "resolveConceptSetExpression",
      ),
      {
        method: "POST",
        headers: buildHeaders(this.token, "application/json"),
        body: JSON.stringify(expression),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to resolve WebAPI concept set expression for source ${validatedSourceKey}: ${response.status}`,
      );
    }

    return response.json();
  }

  async lookupIdentifiers(
    sourceKey: string,
    conceptIds: number[],
  ): Promise<IWebApiConcept[]> {
    const validatedSourceKey = assertSourceKey(sourceKey);
    const validatedConceptIds = assertConceptIds(conceptIds);

    const response = await fetch(
      buildUrl(
        this.baseUrl,
        "vocabulary",
        validatedSourceKey,
        "lookup",
        "identifiers",
      ),
      {
        method: "POST",
        headers: buildHeaders(this.token, "application/json"),
        body: JSON.stringify(validatedConceptIds),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to lookup WebAPI identifiers for source ${validatedSourceKey}: ${response.status}`,
      );
    }

    return response.json();
  }
}
