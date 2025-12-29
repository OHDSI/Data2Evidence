/**
 * Deep Link Handler - URL parameter detection and dataset sync for deep linking.
 * Portal uses: datasetId, route (for navigation)
 * PA uses: linkType, query (restored to URL for PA to consume)
 */

import { loadDeepLinkParams, clearDeepLinkParams } from "./deepLinkStorage";

/**
 * Extracts datasetId from URL query parameters or sessionStorage
 * @param url - Full URL string (e.g., window.location.href)
 * @returns datasetId string or null if not present/empty
 */
export const extractDatasetIdFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const datasetId = urlObj.searchParams.get("datasetId");

    // Return datasetId from URL if present and non-empty
    if (datasetId !== null && datasetId !== "") {
      return datasetId;
    }

    // Fallback to sessionStorage if URL doesn't have datasetId
    // This handles the case where auth redirects stripped the params
    const storedParams = loadDeepLinkParams();
    if (storedParams?.datasetId) {
      return storedParams.datasetId;
    }

    return null;
  } catch (error) {
    // Invalid URL format - try sessionStorage as fallback
    const storedParams = loadDeepLinkParams();
    return storedParams?.datasetId ?? null;
  }
};

/**
 * Validates if a datasetId is non-empty
 * @param datasetId - Dataset ID to validate
 * @returns true if valid (non-empty string), false otherwise
 */
export const isValidDatasetId = (datasetId: string | null | undefined): datasetId is string => {
  return typeof datasetId === "string" && datasetId.length > 0;
};

export interface SyncDatasetFromUrlParams {
  /** Full URL to extract datasetId from (typically window.location.href) */
  url: string;
  /** List of available datasets user has access to */
  availableDatasets: Array<{ id: string; tenant?: { id: string }; [key: string]: any }>;
  /** Function to set the active dataset ID */
  setActiveDatasetId: (datasetId: string) => void;
  /** Function to display feedback notifications */
  setFeedback: (feedback: { type: "error" | "success"; message: string; description?: string }) => void;
  /** Navigation function to route to information page */
  navigate: (path: string, options?: { state?: any }) => void;
  /** Base path for navigation (e.g., '/researcher') */
  basePath: string;
}

export interface SyncDatasetFromUrlResult {
  /** Whether a datasetId was found in URL */
  hasDatasetParam: boolean;
  /** Whether sync was successful */
  syncSuccess: boolean;
  /** The datasetId that was processed (if any) */
  datasetId: string | null;
}

/**
 * Synchronizes Portal's selected dataset based on URL parameter and routes to appropriate page.
 * Uses 'route' param for navigation target, restores 'linkType' and 'query' to URL for PA.
 */
export const syncDatasetFromUrl = ({
  url,
  availableDatasets,
  setActiveDatasetId,
  setFeedback,
  navigate,
  basePath,
}: SyncDatasetFromUrlParams): SyncDatasetFromUrlResult => {
  const datasetId = extractDatasetIdFromUrl(url);

  // No datasetId parameter - normal behavior, no sync needed
  if (!isValidDatasetId(datasetId)) {
    return {
      hasDatasetParam: false,
      syncSuccess: false,
      datasetId: null,
    };
  }

  // Find the dataset to get tenant information
  const dataset = availableDatasets.find((ds) => ds?.id && ds.id === datasetId);

  if (!dataset) {
    // Dataset not found or user doesn't have access
    setFeedback({
      type: "error",
      message: "Unable to Open Dataset",
      description: `The dataset "${datasetId}" specified in the URL is not available. This may be because the dataset does not exist, has been deleted, or you do not have the required permissions to access it.`,
    });

    // Clear sessionStorage to prevent retrying with invalid params
    clearDeepLinkParams();

    return {
      hasDatasetParam: true,
      syncSuccess: false,
      datasetId,
    };
  }

  // Valid dataset - set as active
  setActiveDatasetId(datasetId);

  // Get stored params and current URL params
  const storedParams = loadDeepLinkParams();
  const urlObj = new URL(url);

  // Determine target route from 'route' param (default: information)
  const route = urlObj.searchParams.get("route") || storedParams?.route;
  const targetRoute = route || "information";

  // Build query string with only PA params (linkType, query) - not Portal params (datasetId, route)
  const paParams = new URLSearchParams();
  const linkType = urlObj.searchParams.get("linkType") || storedParams?.linkType;
  const query = urlObj.searchParams.get("query") || storedParams?.query;
  if (linkType) paParams.set("linkType", linkType);
  if (query) paParams.set("query", query);

  // Build navigation path
  const queryString = paParams.toString();
  const navigationPath = queryString ? `${basePath}/${targetRoute}?${queryString}` : `${basePath}/${targetRoute}`;

  // Navigate to target page
  navigate(navigationPath, {
    state: {
      tenantId: dataset.tenant?.id,
    },
  });

  // Clear sessionStorage after successful use (one-time use)
  clearDeepLinkParams();

  return {
    hasDatasetParam: true,
    syncSuccess: true,
    datasetId,
  };
};
