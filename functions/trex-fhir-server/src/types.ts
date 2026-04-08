export enum HTTPMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  PATCH = "PATCH",
  DELETE = "DELETE",
}

export type Headers = { [key: string]: string | string[] };

export const filterHeaders = (
  incomingHeaders: Headers,
  isBinaryReq: boolean,
  httpMethod: HTTPMethod,
): Headers => {
  let filteredHeaders: Headers = { ...incomingHeaders };

  // Non-exhaustive
  let headersToExclude = [
    "host",
    "accept",
    "authorization",
    "user-agent",
    "connection",
    "content-length",
    "accept-encoding",
    "transfer-encoding",
    "cache-control",
    "content-type",
    "upgrade-insecure-requests",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-source-origin",
    "postman-token",
  ];

  const originalContentType = filteredHeaders["content-type"];

  headersToExclude.forEach((header: string) => {
    delete filteredHeaders[header];
  });

  if (
    (isBinaryReq === true && httpMethod === HTTPMethod.POST) ||
    (isBinaryReq === true && httpMethod === HTTPMethod.GET)
  ) {
    filteredHeaders["Content-Type"] = originalContentType;
  } else {
    filteredHeaders["Content-Type"] = "application/json";
  }

  return filteredHeaders;
};
