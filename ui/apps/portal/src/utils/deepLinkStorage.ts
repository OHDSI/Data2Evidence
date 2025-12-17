/**
 * SessionStorage utility for persisting deep link parameters across auth redirects
 *
 * When a user opens a deep link with query parameters (datasetId, linkType, query),
 * the auth flow redirects through /no-access and strips these parameters.
 * This utility saves and restores the parameters using sessionStorage.
 */

const STORAGE_KEY = "deepLinkParams";

export interface DeepLinkParams {
  datasetId?: string;
  linkType?: string;
  query?: string;
  [key: string]: string | undefined;
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
    const searchParams = typeof url === "string" ? new URL(url).searchParams : url;
    const params: DeepLinkParams = {};

    // Extract known deep link parameters
    const datasetId = searchParams.get("datasetId");
    const linkType = searchParams.get("linkType");
    const query = searchParams.get("query");

    if (datasetId) params.datasetId = datasetId;
    if (linkType) params.linkType = linkType;
    if (query) params.query = query;

    return params;
  } catch (error) {
    console.warn("Failed to extract deep link params from URL:", error);
    return {};
  }
};
