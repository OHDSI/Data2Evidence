import { env } from "../env";

/**
 * Request helper utilities for MCP tools
 * Provides common patterns for authorization, validation, and response formatting
 */

interface RequestInfo {
  headers?: {
    authorization?: string | string[];
    datasetid?: string | string[];
    [key: string]: any;
  };
}

/**
 * Extract and validate authorization header from request
 * @throws Error if authorization is missing
 */
export function requireAuth(requestInfo?: RequestInfo): string {
  const authorization = requestInfo?.headers?.authorization;

  if (!authorization) {
    throw new Error("Authorization is missing");
  }

  return String(authorization);
}

/**
 * Extract and validate both authorization and datasetId headers from request
 * @throws Error if either authorization or datasetId is missing
 */
export function requireAuthAndDataset(requestInfo?: RequestInfo): {
  authorization: string;
  datasetId: string;
} {
  const authorization = requestInfo?.headers?.authorization;
  const datasetId = requestInfo?.headers?.datasetid;

  if (!authorization || !datasetId) {
    throw new Error("Authorization or datasetId is missing");
  }

  return {
    authorization: String(authorization),
    datasetId: String(datasetId),
  };
}

/**
 * Create a success text response for tool output
 */
export function createTextResponse(text: string) {
  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
  };
}

/**
 * Create a response with both text and structured content
 */
export function createStructuredResponse<T>(text: string, data: T) {
  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
    structuredContent: data,
  };
}

/**
 * Get username from usermgmt API based on authorization token
 */
export async function getUserName(authorization: string): Promise<string> {
  const options = {
    headers: {
      Authorization: authorization,
    },
  };
  const channel = Trex.tokioChannel("d2e-functions/alp-usermgmt");
  const url = `${env.SERVICE_ROUTES.usermgmt}/me`;
  const res = await channel.get(url, options);
  return res.data.username;
}
