/**
 * Decide whether a dataset should have WebAPI records (source, source_daimon,
 * "Source user" role). Only webapi-managed datasets do. Source / omop-cache /
 * study / fhir / strategus datasets keep none.
 */
export function shouldSyncToWebApi(
  type: string | undefined,
  fhirDatasetId: string | null | undefined,
): boolean {
  if (fhirDatasetId) return false;
  const normalized = type?.replace(/^hana__/, "");
  return normalized === "webapi";
}
