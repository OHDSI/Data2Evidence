import { getMriQueryIdentity } from "./mriQueryComparator";

export const WIZARD_BOOKMARK_NAME_PATTERN = /^wizards-\d{13}$/;

export interface WizardBookmarkScope {
  datasetId: string;
  username: string;
  paConfigId?: string;
}

export interface WizardBookmarkCandidate {
  bmkId: string;
  bookmarkname: string;
  bookmark: Record<string, unknown>;
  modified: string;
  modifiedAt: number;
  userId: string;
  shared: false;
  paConfigId?: string;
  cohortDefinitionId?: number;
  queryIdentity: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseBookmark(value: unknown): Record<string, unknown> | null {
  if (isRecord(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseCandidate(item: unknown, scope: WizardBookmarkScope): WizardBookmarkCandidate | null {
  if (!isRecord(item)) {
    return null;
  }

  const { bmkId, bookmarkname, modified, user_id: userId, shared, paConfigId } = item;
  if (
    typeof bmkId !== "string" ||
    bmkId.length === 0 ||
    typeof bookmarkname !== "string" ||
    !WIZARD_BOOKMARK_NAME_PATTERN.test(bookmarkname) ||
    typeof modified !== "string" ||
    typeof userId !== "string" ||
    userId !== scope.username ||
    shared !== false
  ) {
    return null;
  }

  if (paConfigId !== undefined && typeof paConfigId !== "string") {
    return null;
  }
  if (scope.paConfigId !== undefined && paConfigId !== undefined && paConfigId !== scope.paConfigId) {
    return null;
  }

  const bookmark = parseBookmark(item.bookmark);
  if (bookmark === null || bookmark.datasetId !== scope.datasetId) {
    return null;
  }

  const queryIdentity = getMriQueryIdentity(bookmark);
  if (queryIdentity === null) {
    return null;
  }

  const cohortDefinitionId = item.cohortDefinitionId;
  if (
    cohortDefinitionId !== undefined &&
    (typeof cohortDefinitionId !== "number" || !Number.isInteger(cohortDefinitionId) || cohortDefinitionId <= 0)
  ) {
    return null;
  }

  const parsedModified = Date.parse(modified);
  return {
    bmkId,
    bookmarkname,
    bookmark,
    modified,
    modifiedAt: Number.isFinite(parsedModified) ? parsedModified : Number.NEGATIVE_INFINITY,
    userId,
    shared: false,
    ...(typeof paConfigId === "string" ? { paConfigId } : {}),
    ...(typeof cohortDefinitionId === "number" ? { cohortDefinitionId } : {}),
    queryIdentity,
  };
}

export function parseWizardBookmarkCandidates(items: unknown, scope: WizardBookmarkScope): WizardBookmarkCandidate[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.flatMap((item) => {
    const candidate = parseCandidate(item, scope);
    return candidate === null ? [] : [candidate];
  });
}

function isMaterialized(candidate: WizardBookmarkCandidate): boolean {
  return candidate.cohortDefinitionId !== undefined;
}

export function selectBestWizardBookmark(
  items: unknown,
  scope: WizardBookmarkScope,
  targetQuery: unknown
): WizardBookmarkCandidate | null {
  const targetIdentity = getMriQueryIdentity(targetQuery);
  if (targetIdentity === null) {
    return null;
  }

  const matchingCandidates = parseWizardBookmarkCandidates(items, scope).filter(
    (candidate) => candidate.queryIdentity === targetIdentity
  );

  matchingCandidates.sort((left, right) => {
    const materializedDifference = Number(isMaterialized(right)) - Number(isMaterialized(left));
    if (materializedDifference !== 0) {
      return materializedDifference;
    }

    const modifiedDifference = right.modifiedAt - left.modifiedAt;
    return modifiedDifference !== 0 ? modifiedDifference : left.bmkId.localeCompare(right.bmkId);
  });

  return matchingCandidates[0] ?? null;
}
