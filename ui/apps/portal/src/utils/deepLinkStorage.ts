/**
 * SessionStorage utility for persisting deep link parameters across auth redirects
 *
 * When a user opens a deep link with query parameters (datasetId, linkType, query),
 * the auth flow redirects through /no-access and strips these parameters.
 * This utility saves and restores the parameters using sessionStorage.
 */

const STORAGE_KEY = "deepLinkParams";

export interface DeepLinkParams {
  // Portal params (used for routing, not restored to URL)
  datasetId?: string;
  path?: string; // Full relative path, e.g. "/researcher/wizards" or "/researcher/cohort"
  // PA params (restored to URL for PA to consume)
  linkType?: string;
  query?: string;
}

/**
 * Save deep link parameters to sessionStorage
 * @param params - Deep link parameters to save
 */
export const saveDeepLinkParams = (params: DeepLinkParams): void => {
  try {
    if (Object.keys(params).length > 0) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(params));
    }
  } catch (error) {
    console.warn("Failed to save deep link params to sessionStorage:", error);
  }
};

/**
 * Load deep link parameters from sessionStorage
 * @returns Saved parameters or null if none exist
 */
export const loadDeepLinkParams = (): DeepLinkParams | null => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    console.warn("Failed to load deep link params from sessionStorage:", error);
    return null;
  }
};

/**
 * Clear deep link parameters from sessionStorage (one-time use)
 */
export const clearDeepLinkParams = (): void => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear deep link params from sessionStorage:", error);
  }
};

/**
 * Extract deep link parameters from URL
 * @param url - Full URL or URLSearchParams object
 * @returns Deep link parameters found in URL
 */
export const extractDeepLinkParamsFromUrl = (url: string | URLSearchParams): DeepLinkParams => {
  try {
    if (typeof url === "string") {
      const urlObj = new URL(url);
      const searchParams = urlObj.searchParams;
      const params: DeepLinkParams = {};

      const datasetId = searchParams.get("datasetId");
      const linkType = searchParams.get("linkType");
      const query = searchParams.get("query");

      if (datasetId) params.datasetId = datasetId;
      if (linkType) params.linkType = linkType;
      if (query) params.query = query;

      // Extract path from URL pathname (relative to /d2e/portal)
      // Only capture /researcher/* sub-paths (not /no-access, /login, etc.)
      const pathname = urlObj.pathname;
      const basePath = "/d2e/portal";
      if (pathname.startsWith(basePath)) {
        const relativePath = pathname.slice(basePath.length);
        if (relativePath.startsWith("/researcher/") && relativePath !== "/researcher/") {
          params.path = relativePath;
        }
      }

      // Backward compat: convert ?route=X to path=/researcher/X
      const route = searchParams.get("route");
      if (route && !params.path) {
        params.path = `/researcher/${route}`;
      }

      return params;
    }

    // URLSearchParams path — no pathname available, extract query params only
    const searchParams = url;
    const params: DeepLinkParams = {};

    const datasetId = searchParams.get("datasetId");
    const linkType = searchParams.get("linkType");
    const query = searchParams.get("query");

    if (datasetId) params.datasetId = datasetId;
    if (linkType) params.linkType = linkType;
    if (query) params.query = query;

    // Backward compat: convert ?route=X to path=/researcher/X
    const route = searchParams.get("route");
    if (route) {
      params.path = `/researcher/${route}`;
    }

    return params;
  } catch (error) {
    console.warn("Failed to extract deep link params from URL:", error);
    return {};
  }
};
