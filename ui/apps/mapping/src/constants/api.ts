export const API_BASE_PREFIX = "/d2e";

export const API_PATHS = {
  BACKEND: `${API_BASE_PREFIX}/backend/api/`,
  JOBPLUGINS_PERSEUS: `${API_BASE_PREFIX}/jobplugins/perseus/`,
  SYSTEM_PORTAL: `${API_BASE_PREFIX}/system-portal/`,
  WHITE_RABBIT: `${API_BASE_PREFIX}/white-rabbit/`,
  DATA_MAPPING: `${API_BASE_PREFIX}/data-mapping/`,
  DATAFLOW: `${API_BASE_PREFIX}/jobplugins/`,
} as const;

export type ApiPath = typeof API_PATHS[keyof typeof API_PATHS];
