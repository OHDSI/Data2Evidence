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
    const value = localStorage.getItem(DISCLAIMER_ACCEPTED_KEY);
    return value === "true";
  } catch (error) {
    console.error("Error reading disclaimer acceptance from localStorage:", error);
    return false;
  }
};

/**
 * Save the disclaimer acceptance status to local storage
 * @param accepted - true if the disclaimer was accepted
 */
export const setDisclaimerAccepted = (accepted: boolean): void => {
  try {
    localStorage.setItem(DISCLAIMER_ACCEPTED_KEY, String(accepted));
  } catch (error) {
    console.error("Error saving disclaimer acceptance to localStorage:", error);
  }
};

/**
 * Clear the disclaimer acceptance from local storage
 */
export const clearDisclaimerAcceptance = (): void => {
  try {
    localStorage.removeItem(DISCLAIMER_ACCEPTED_KEY);
  } catch (error) {
    console.error("Error clearing disclaimer acceptance from localStorage:", error);
  }
};
