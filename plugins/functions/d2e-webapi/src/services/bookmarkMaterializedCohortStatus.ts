import {
  BookmarkMaterializedCohortStatus,
  type IBaseMaterializedCohort,
  type IBookmark,
} from "../api/types.ts";

const readRecordedBookmarkVersion = (syntax: unknown): unknown => {
  if (typeof syntax !== "string") {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(syntax);
  } catch {
    return undefined;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return undefined;
  }
  return (parsed as { bookmarkVersion?: unknown }).bookmarkVersion;
};

/**
 * Compares the `bookmarkVersion` in the cohort syntax with the bookmark
 * `version`. No cohort: NOT_RUN. No `bookmarkVersion`, or a syntax that is
 * not a JSON object: READY. Equal numbers: READY. All other values,
 * including null: STALE.
 */
export const deriveBookmarkMaterializedCohortStatus = (
  bookmark: Pick<IBookmark, "version">,
  cohort: Pick<IBaseMaterializedCohort, "syntax"> | undefined,
): BookmarkMaterializedCohortStatus => {
  if (!cohort) {
    return BookmarkMaterializedCohortStatus.NOT_RUN;
  }
  const recordedVersion = readRecordedBookmarkVersion(cohort.syntax);
  if (recordedVersion === undefined) {
    return BookmarkMaterializedCohortStatus.READY;
  }
  return typeof recordedVersion === "number" &&
      recordedVersion === bookmark.version
    ? BookmarkMaterializedCohortStatus.READY
    : BookmarkMaterializedCohortStatus.STALE;
};
