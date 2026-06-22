import { env } from "../env.ts";
import { ICohortExpression } from "../types.ts";

const DEFAULT_WEBAPI_URL = "http://localhost:33001/WebAPI";

export type IWebAPICohortDefinitionExpressionType =
  | "SIMPLE_EXPRESSION"
  | "CUSTOM_SQL"
  | "EXTERNAL_SOURCED";

export interface IWebAPICohortDefinitionUser {
  id: number;
  login: string;
  name: string;
}

export interface IWebAPICohortDefinitionTag {
  name: string;
  id: number;
  hasWriteAccess: boolean;
  modifiedBy: IWebAPICohortDefinitionUser;
  createdBy: IWebAPICohortDefinitionUser;
  createdDate: string;
  modifiedDate: string;
  icon: string;
  permissionProtected: boolean;
  multiSelection: boolean;
  mandatory: boolean;
  type: "SYSTEM" | "CUSTOM" | "PRIZM";
  description: string;
  count: number;
  groups: unknown[];
  color: string;
  showGroup: boolean;
  allowCustom: boolean;
}

export interface IWebAPICohortDefinition {
  [key: string]: unknown;
  id: number;
  name: string;
  description: string;
  hasWriteAccess: boolean;
  tags: IWebAPICohortDefinitionTag[];
  expressionType: IWebAPICohortDefinitionExpressionType;
  expression: ICohortExpression | string;
  modifiedBy: IWebAPICohortDefinitionUser;
  createdBy: IWebAPICohortDefinitionUser;
  createdDate: string;
  modifiedDate: string;
}

export interface IWebAPICohortDefinitionPayload {
  [key: string]: unknown;
  id?: number;
  name?: string;
  description?: string | null;
  expressionType?: string;
  expression?: ICohortExpression;
  createdBy?: string | null;
  createdDate?: number | null;
  modifiedBy?: string | null;
  modifiedDate?: number | null;
  tags?: string[];
}

export class WebAPIAPI {
  private readonly baseURL: string;
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for WebAPIAPI!");
    }

    this.baseURL = (env.SERVICE_ROUTES.webapi || DEFAULT_WEBAPI_URL).replace(
      /\/+$/,
      "",
    );
  }

  async getCohortDefinitionList(): Promise<IWebAPICohortDefinition[]> {
    const url = `${this.baseURL}/cohortdefinition/`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.buildHeaders(),
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to get WebAPI cohort definitions: ${response.status} ${errorText}`,
      );
    }

    return response.json();
  }

  async getCohortDefinition(
    cohortDefinitionId: number,
  ): Promise<IWebAPICohortDefinition> {
    const url = `${this.baseURL}/cohortdefinition/${encodeURIComponent(cohortDefinitionId)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.buildHeaders(),
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to get WebAPI cohort definition: ${response.status} ${errorText}`,
      );
    }

    return response.json();
  }

  async createCohortDefinition(
    cohortDefinition: IWebAPICohortDefinitionPayload,
  ): Promise<IWebAPICohortDefinition> {
    const url = `${this.baseURL}/cohortdefinition/`;
    const response = await fetch(url, {
      method: "POST",
      headers: this.buildHeaders("application/json"),
      body: JSON.stringify(cohortDefinition),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create WebAPI cohort definition: ${response.status} ${errorText}`,
      );
    }

    return response.json();
  }

  async updateCohortDefinition(
    cohortDefinition: IWebAPICohortDefinitionPayload,
  ): Promise<IWebAPICohortDefinition> {
    const cohortDefinitionId = cohortDefinition.id;
    if (typeof cohortDefinitionId !== "number") {
      throw new Error("cohortDefinition.id is required for update");
    }
    const url = `${this.baseURL}/cohortdefinition/${encodeURIComponent(cohortDefinitionId)}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: this.buildHeaders("application/json"),
      body: JSON.stringify(cohortDefinition),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to update WebAPI cohort definition: ${response.status} ${errorText}`,
      );
    }

    return response.json();
  }

  async deleteCohortDefinition(cohortDefinitionId: number): Promise<void> {
    const url = `${this.baseURL}/cohortdefinition/${encodeURIComponent(cohortDefinitionId)}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to delete WebAPI cohort definition: ${response.status} ${errorText}`,
      );
    }
  }

  async copyCohortDefinition(
    cohortDefinitionId: number,
  ): Promise<IWebAPICohortDefinition> {
    const url = `${this.baseURL}/cohortdefinition/${encodeURIComponent(cohortDefinitionId)}/copy`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.buildHeaders(),
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to copy WebAPI cohort definition: ${response.status} ${errorText}`,
      );
    }

    return response.json();
  }

  private buildHeaders(contentType?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: this.token.toLowerCase().startsWith("bearer ")
        ? this.token
        : `Bearer ${this.token}`,
    };

    if (contentType) {
      headers["Content-Type"] = contentType;
    }

    return headers;
  }
}
