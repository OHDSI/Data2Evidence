/**
 * Utilities for detecting embedding context
 */

/**
 * Check if running inside an iframe
 */
export const isEmbedded = (): boolean => {
  try {
    return window.self !== window.top;
  } catch (e) {
    // Cross-origin iframe will throw
    return true;
  }
};

/**
 * Check if embedded within the researcher portal
 */
export const isPortalEmbed = (): boolean => {
  if (!isEmbedded()) return false;

  try {
    // Check if parent URL contains /researcher/
    // This may fail for cross-origin, but we're same-origin
    return window.parent.location.pathname.includes('/researcher/');
  } catch (e) {
    // If we can't access parent location, check our own path
    return window.location.pathname.includes('/researcher/');
  }
};

/**
 * Get the embedding mode
 */
export type EmbedMode = 'standalone' | 'portal' | 'unknown';

export const getEmbedMode = (): EmbedMode => {
  if (!isEmbedded()) return 'standalone';
  if (isPortalEmbed()) return 'portal';
  return 'unknown';
};
