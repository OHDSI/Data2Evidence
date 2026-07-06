import { config } from "../config.js";

// Replaces {{key}} tokens in scenario files with the matching config value.
// Token names must exactly match keys in config.ts (e.g. {{D2E_BASE_URL}}, {{DATASET_ID}}).
// Unrecognised tokens are left as-is.
export function substituteConfig(raw: string): string {
  let result = raw;
  for (const [key, value] of Object.entries(config)) {
    result = result.replaceAll(`{{${key}}}`, String(value));
  }
  return result;
}
