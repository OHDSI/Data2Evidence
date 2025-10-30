export const API_BASE_PREFIX = "/d2e";

export const API_PATHS = {
  JOBPLUGINS: `${API_BASE_PREFIX}/jobplugins/`,
  PREFECT: `${API_BASE_PREFIX}/prefect/`,
  MAPPING: `${API_BASE_PREFIX}/mapping/`,
  WHITE_RABBIT: `${API_BASE_PREFIX}/white-rabbit/`,
  SYSTEM_PORTAL: `${API_BASE_PREFIX}/system-portal/`,
  BACKEND: `${API_BASE_PREFIX}/backend/`,
  CONCEPT_MAPPING: `${API_BASE_PREFIX}/resources/concept-mapping/`,
} as const;

export type ApiPath = typeof API_PATHS[keyof typeof API_PATHS];
