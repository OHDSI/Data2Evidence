export const API_BASE_PREFIX = "/d2e";

export const API_PATHS = {
  JOBPLUGINS: `${API_BASE_PREFIX}/jobplugins/`,
  PREFECT: `${API_BASE_PREFIX}/prefect/`,
  D2E_WEBAPI: `${API_BASE_PREFIX}/d2e-webapi/`,
} as const;

export type ApiPath = typeof API_PATHS[keyof typeof API_PATHS];
