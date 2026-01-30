import type { ResultAction } from "../types/wizard";

/**
 * Generate deep link URL for wizard result action.
 *
 * Expected URL format (from PRD):
 * https://[d2e-url]/d2e/portal/researcher?datasetId=[datasetId]&route=cohort&linkType=cohort-definition&query=[base64-json]
 *
 * @param action - Result action configuration
 * @param formData - Wizard form data to encode in URL
 * @param datasetId - Dataset ID from portal context
 * @returns Deep link URL string, or null for non-link actions
 */
export function generateDeepLink(
  action: ResultAction,
  formData: Record<string, any>,
  datasetId?: string,
): string | null {
  if (action.type !== "deep-link" || !action.urlTemplate) {
    return null;
  }

  const encodedConfig = encodeWizardConfig(formData);
  const resolvedDatasetId = datasetId || "placeholder-dataset-id";

  // MVP: Use placeholder base URL
  // TODO: Replace with actual D2E URL from portal context
  const url = action.urlTemplate
    .replace("{datasetId}", encodeURIComponent(resolvedDatasetId))
    .replace("{encodedConfig}", encodeURIComponent(encodedConfig));

  return url;
}

/**
 * Encode wizard configuration as base64 JSON for URL query parameter.
 * Handles Unicode characters correctly using TextEncoder.
 */
export function encodeWizardConfig(formData: Record<string, any>): string {
  const jsonString = JSON.stringify(formData);
  const utf8Bytes = new TextEncoder().encode(jsonString);
  const binaryString = Array.from(utf8Bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binaryString);
}

/**
 * Decode wizard configuration from base64 query parameter.
 * Future: Used by PA cohort builder to parse wizard config.
 * Handles Unicode characters correctly using TextDecoder.
 */
export function decodeWizardConfig(encoded: string): Record<string, any> {
  try {
    const binaryString = atob(encoded);
    const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
    const jsonString = new TextDecoder().decode(bytes);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("[Wizards] Failed to decode wizard config:", error);
    throw new Error("Invalid wizard configuration format");
  }
}
