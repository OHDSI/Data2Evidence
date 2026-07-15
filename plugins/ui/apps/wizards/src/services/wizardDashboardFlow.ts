import {
  createWizardBookmark,
  materializeWizardBookmark,
  type CreateWizardBookmarkResult,
  type CreateWizardBookmarkInput,
  type MaterializeWizardBookmarkInput,
} from "../api/wizardCohortApi";
import type { MriBookmark } from "../utils/mriQuery";
import { buildMriMaterializationQuery } from "../utils/mriMaterializationQuery";
import {
  findWizardBookmarkById,
  selectBestWizardBookmark,
  type WizardBookmarkCandidate,
  type WizardBookmarkScope,
} from "../utils/wizardBookmarkCache";
import type { WizardDashboardResult, WizardDashboardStatus } from "./wizardDashboardState";

type FlowStage = Exclude<WizardDashboardStatus, "idle" | "ready" | "error">;

export interface PendingWizardBookmark {
  bmkId: string;
  bookmarkName: string;
}

export interface RunWizardDashboardFlowInput {
  datasetId: string;
  username: string;
  paConfigId: string;
  cdmConfigId: string;
  cdmConfigVersion: string;
  bookmark: MriBookmark;
  wizardConfig: Record<string, unknown>;
  pendingBookmark?: PendingWizardBookmark | null;
  materializationSubmittedForBookmarkId?: string | null;
  signal?: AbortSignal;
}

export interface WizardDashboardFlowDependencies {
  ensureCache: () => Promise<unknown>;
  refreshCache: () => Promise<unknown>;
  createBookmark?: (input: CreateWizardBookmarkInput) => Promise<CreateWizardBookmarkResult>;
  materializeBookmark?: (input: MaterializeWizardBookmarkInput) => Promise<void>;
  now?: () => number;
  onStage?: (stage: FlowStage) => void;
  onBookmarkCreated?: (bookmark: PendingWizardBookmark) => void;
  onMaterializationSubmitted?: (bookmarkId: string) => void;
}

export function createWizardBookmarkName(now = Date.now()): string {
  if (!Number.isInteger(now) || String(now).length !== 13) {
    throw new Error("Unable to create Wizard bookmark name");
  }
  return `wizards-${now}`;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Wizard dashboard flow was cancelled", "AbortError");
}

export async function runWizardDashboardFlow(
  input: RunWizardDashboardFlowInput,
  dependencies: WizardDashboardFlowDependencies,
): Promise<WizardDashboardResult> {
  const scope: WizardBookmarkScope = {
    datasetId: input.datasetId,
    username: input.username,
    paConfigId: input.paConfigId,
  };
  const createBookmark = dependencies.createBookmark ?? createWizardBookmark;
  const materializeBookmark = dependencies.materializeBookmark ?? materializeWizardBookmark;
  const stage = dependencies.onStage ?? (() => undefined);

  throwIfAborted(input.signal);
  stage("awaiting-cache");
  let items = await dependencies.ensureCache();
  throwIfAborted(input.signal);

  let candidate: WizardBookmarkCandidate | null = null;
  if (input.pendingBookmark) {
    candidate = findWizardBookmarkById(items, scope, input.pendingBookmark.bmkId);
  }
  candidate ??= selectBestWizardBookmark(items, scope, input.bookmark);

  if (!candidate && !input.pendingBookmark) {
    items = await dependencies.refreshCache();
    throwIfAborted(input.signal);
    candidate ??= selectBestWizardBookmark(items, scope, input.bookmark);
  }

  const cacheOutcome = candidate
    ? candidate.cohortDefinitionId === undefined
      ? "hit-unmaterialized"
      : "hit-ready"
    : "miss";

  let bookmarkId = candidate?.bmkId ?? input.pendingBookmark?.bmkId;
  let bookmarkName = candidate?.bookmarkname ?? input.pendingBookmark?.bookmarkName;
  let cohortDefinitionId = candidate?.cohortDefinitionId;

  if (!candidate) {
    if (!bookmarkId || !bookmarkName) {
      bookmarkName = createWizardBookmarkName((dependencies.now ?? Date.now)());
      stage("saving-bookmark");
      const created = await createBookmark({
        datasetId: input.datasetId,
        bookmarkname: bookmarkName,
        bookmark: input.bookmark,
        paConfigId: input.paConfigId,
        cdmConfigId: input.cdmConfigId,
        cdmConfigVersion: input.cdmConfigVersion,
      });
      bookmarkId = created.bmkId;
      dependencies.onBookmarkCreated?.({ bmkId: bookmarkId, bookmarkName });
      throwIfAborted(input.signal);
    }
  }
  if (!bookmarkId || !bookmarkName) {
    throw new Error("The Wizard bookmark did not include an id and name");
  }

  const mriQuery = buildMriMaterializationQuery(input.bookmark, input.datasetId);
  if (cohortDefinitionId === undefined) {
    if (input.materializationSubmittedForBookmarkId !== bookmarkId) {
      stage("materializing");
      await materializeBookmark({
        datasetId: input.datasetId,
        bookmarkId,
        bookmarkName,
        mriQuery,
      });
      dependencies.onMaterializationSubmitted?.(bookmarkId);
      throwIfAborted(input.signal);
    }
    stage("resolving-cohort");
    const refreshedItems = await dependencies.refreshCache();
    throwIfAborted(input.signal);
    const refreshedBookmark = findWizardBookmarkById(refreshedItems, scope, bookmarkId);
    if (refreshedBookmark?.cohortDefinitionId === undefined) {
      throw new Error("The materialized Wizard cohort was not returned by the bookmark list");
    }
    cohortDefinitionId = refreshedBookmark.cohortDefinitionId;
  }

  stage("opening-dashboard");
  return {
    bookmarkId,
    bookmarkName,
    cohortId: cohortDefinitionId,
    wizardConfig: input.wizardConfig,
    mriquery: JSON.stringify(mriQuery),
    cacheOutcome,
  };
}
