export const API_BASE_PREFIX = "/d2e";

export const API_PATHS = {
  SYSTEM_PORTAL: `${API_BASE_PREFIX}/system-portal/`,
  TREX: `${API_BASE_PREFIX}/trex/`,
  GATEWAY: `${API_BASE_PREFIX}/gateway/api`,
  GATEWAY_API_DB: `${API_BASE_PREFIX}/gateway/api/db/`,
  JOBPLUGINS: `${API_BASE_PREFIX}/jobplugins/`,
  USER_MGMT: `${API_BASE_PREFIX}/usermgmt/api/`,
  STUDY_NOTEBOOK: `${API_BASE_PREFIX}/system-portal/notebook`,
  TERMINOLOGY: `${API_BASE_PREFIX}/terminology`,
  D2E_WEBAPI: `${API_BASE_PREFIX}/d2e-webapi`,
  STRATEGUS_ANALYSIS: `${API_BASE_PREFIX}/strategus/analysis`,
  STRATEGUS_RESULTS: `${API_BASE_PREFIX}/strategus-results`,
  STORAGE: `${API_BASE_PREFIX}/storage/`,
  DEMO: `${API_BASE_PREFIX}/demo/`,
  ANALYTICS_SVC: `${API_BASE_PREFIX}/analytics-svc`,
  PORTAL_TRANSLATIONS: `${API_BASE_PREFIX}/portal/translations`,
} as const;

export type ApiPath = typeof API_PATHS[keyof typeof API_PATHS];
