/**
 * Local storage key for disclaimer acceptance
 */
const DISCLAIMER_ACCEPTED_KEY = "disclaimer-accepted";

/**
 * Check if the user has previously accepted the disclaimer
 * @returns true if the disclaimer has been accepted, false otherwise
 */
export const hasDisclaimerBeenAccepted = (): boolean => {
  try {
    const value = sessionStorage.getItem(DISCLAIMER_ACCEPTED_KEY);
    return value === "true";
  } catch (error) {
    console.error("Error reading disclaimer acceptance from sessionStorage:", error);
    return false;
  }
};

/**
 * Save the disclaimer acceptance status to session storage
 * Note: This function should only be called with `true` to persist acceptance.
 * Not accepting (declining) doesn't need persistence - absence means not accepted.
 * @param accepted - true if the disclaimer was accepted
 */
export const setDisclaimerAccepted = (accepted: boolean): void => {
  try {
    if (accepted) {
      sessionStorage.setItem(DISCLAIMER_ACCEPTED_KEY, String(accepted));
    }
  } catch (error) {
    console.error("Error saving disclaimer acceptance to sessionStorage:", error);
  }
};

/**
 * Clear the disclaimer acceptance from session storage
 */
export const clearDisclaimerAcceptance = (): void => {
  try {
    sessionStorage.removeItem(DISCLAIMER_ACCEPTED_KEY);
  } catch (error) {
    console.error("Error clearing disclaimer acceptance from sessionStorage:", error);
  }
};
