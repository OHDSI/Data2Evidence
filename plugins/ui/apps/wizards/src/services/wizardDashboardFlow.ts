import {
  createWizardBookmark,
  materializeWizardBookmark,
  type CreateWizardBookmarkInput,
  type MaterializeWizardBookmarkInput,
} from "../api/wizardCohortApi";
import type { MriBookmark } from "../utils/mriQuery";
import { buildMriMaterializationQuery } from "../utils/mriMaterializationQuery";
import {
  findWizardBookmarkByName,
  pollForWizardBookmark,
  type PollForWizardBookmarkOptions,
} from "./wizardBookmarkResolution";
import {
  selectBestWizardBookmark,
  type WizardBookmarkCandidate,
  type WizardBookmarkScope,
} from "../utils/wizardBookmarkCache";
import type { WizardDashboardResult, WizardDashboardStatus } from "./wizardDashboardState";

type FlowStage = Exclude<WizardDashboardStatus, "idle" | "ready" | "error">;

export interface RunWizardDashboardFlowInput {
  datasetId: string;
  username: string;
  paConfigId: string;
  cdmConfigId: string;
  cdmConfigVersion: string;
  bookmark: MriBookmark;
  wizardConfig: Record<string, unknown>;
  pendingBookmarkName?: string | null;
  materializationSubmittedForBookmarkId?: string | null;
  signal?: AbortSignal;
}

export interface WizardDashboardFlowDependencies {
  ensureCache: () => Promise<unknown>;
  refreshCache: () => Promise<unknown>;
  createBookmark?: (input: CreateWizardBookmarkInput) => Promise<void>;
  materializeBookmark?: (input: MaterializeWizardBookmarkInput) => Promise<void>;
  poll?: (options: PollForWizardBookmarkOptions) => Promise<WizardBookmarkCandidate>;
  now?: () => number;
  onStage?: (stage: FlowStage) => void;
  onBookmarkName?: (bookmarkName: string) => void;
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
  dependencies: WizardDashboardFlowDependencies
): Promise<WizardDashboardResult> {
  const scope: WizardBookmarkScope = {
    datasetId: input.datasetId,
    username: input.username,
    paConfigId: input.paConfigId,
  };
  const createBookmark = dependencies.createBookmark ?? createWizardBookmark;
  const materializeBookmark = dependencies.materializeBookmark ?? materializeWizardBookmark;
  const poll = dependencies.poll ?? pollForWizardBookmark;
  const stage = dependencies.onStage ?? (() => undefined);

  throwIfAborted(input.signal);
  stage("awaiting-cache");
  let items = await dependencies.ensureCache();
  throwIfAborted(input.signal);

  let candidate: WizardBookmarkCandidate | null = null;
  if (input.pendingBookmarkName) {
    candidate = findWizardBookmarkByName(items, scope, input.pendingBookmarkName);
  }
  candidate ??= selectBestWizardBookmark(items, scope, input.bookmark);

  if (!candidate) {
    items = await dependencies.refreshCache();
    throwIfAborted(input.signal);
    if (input.pendingBookmarkName) {
      candidate = findWizardBookmarkByName(items, scope, input.pendingBookmarkName);
    }
    candidate ??= selectBestWizardBookmark(items, scope, input.bookmark);
  }

  const cacheOutcome = candidate
    ? candidate.cohortDefinitionId === undefined
      ? "hit-unmaterialized"
      : "hit-ready"
    : "miss";

  if (!candidate) {
    const bookmarkName = input.pendingBookmarkName ?? createWizardBookmarkName((dependencies.now ?? Date.now)());
    dependencies.onBookmarkName?.(bookmarkName);
    stage("saving-bookmark");
    await createBookmark({
      datasetId: input.datasetId,
      bookmarkname: bookmarkName,
      bookmark: input.bookmark,
      paConfigId: input.paConfigId,
      cdmConfigId: input.cdmConfigId,
      cdmConfigVersion: input.cdmConfigVersion,
    });
    throwIfAborted(input.signal);
    candidate = await poll({
      refresh: dependencies.refreshCache,
      scope,
      bookmarkName,
      requirement: "bookmark",
      signal: input.signal,
    });
  }

  const mriQuery = buildMriMaterializationQuery(input.bookmark, input.datasetId);
  if (candidate.cohortDefinitionId === undefined) {
    if (input.materializationSubmittedForBookmarkId !== candidate.bmkId) {
      stage("materializing");
      await materializeBookmark({
        datasetId: input.datasetId,
        bookmarkId: candidate.bmkId,
        bookmarkName: candidate.bookmarkname,
        mriQuery,
      });
      dependencies.onMaterializationSubmitted?.(candidate.bmkId);
      throwIfAborted(input.signal);
    }
    stage("resolving-cohort");
    candidate = await poll({
      refresh: dependencies.refreshCache,
      scope,
      bookmarkName: candidate.bookmarkname,
      requirement: "cohort",
      signal: input.signal,
    });
  }

  stage("opening-dashboard");
  return {
    bookmarkId: candidate.bmkId,
    bookmarkName: candidate.bookmarkname,
    cohortId: candidate.cohortDefinitionId!,
    wizardConfig: input.wizardConfig,
    mriquery: JSON.stringify(mriQuery),
    cacheOutcome,
  };
}
