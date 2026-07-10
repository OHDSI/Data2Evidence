import {
  parseWizardBookmarkCandidates,
  type WizardBookmarkCandidate,
  type WizardBookmarkScope,
} from "../utils/wizardBookmarkCache";

export type WizardBookmarkResolutionCode = "bookmark-not-found" | "cohort-not-ready" | "cancelled";
export type WizardBookmarkRequirement = "bookmark" | "cohort";

export class WizardBookmarkResolutionError extends Error {
  readonly code: WizardBookmarkResolutionCode;

  constructor(message: string, code: WizardBookmarkResolutionCode) {
    super(message);
    this.name = "WizardBookmarkResolutionError";
    this.code = code;
  }
}

export function findWizardBookmarkByName(
  items: unknown,
  scope: WizardBookmarkScope,
  bookmarkName: string
): WizardBookmarkCandidate | null {
  return (
    parseWizardBookmarkCandidates(items, scope).find((candidate) => candidate.bookmarkname === bookmarkName) ?? null
  );
}

type Wait = (delayMs: number, signal?: AbortSignal) => Promise<void>;

export interface PollForWizardBookmarkOptions {
  refresh: () => Promise<unknown>;
  scope: WizardBookmarkScope;
  bookmarkName: string;
  requirement: WizardBookmarkRequirement;
  maxAttempts?: number;
  signal?: AbortSignal;
  wait?: Wait;
}

const defaultWait: Wait = (delayMs, signal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new WizardBookmarkResolutionError("Wizard bookmark resolution was cancelled", "cancelled"));
      return;
    }

    const timeout = window.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, delayMs);
    const handleAbort = () => {
      window.clearTimeout(timeout);
      reject(new WizardBookmarkResolutionError("Wizard bookmark resolution was cancelled", "cancelled"));
    };
    signal?.addEventListener("abort", handleAbort, { once: true });
  });

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new WizardBookmarkResolutionError("Wizard bookmark resolution was cancelled", "cancelled");
  }
}

function pollingDelay(attempt: number): number {
  return Math.min(250 * 2 ** attempt, 2000);
}

export async function pollForWizardBookmark({
  refresh,
  scope,
  bookmarkName,
  requirement,
  maxAttempts = 10,
  signal,
  wait = defaultWait,
}: PollForWizardBookmarkOptions): Promise<WizardBookmarkCandidate> {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error("maxAttempts must be at least 1");
  }

  let bookmarkSeen = false;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    throwIfAborted(signal);
    const items = await refresh();
    throwIfAborted(signal);
    const candidate = findWizardBookmarkByName(items, scope, bookmarkName);
    if (candidate) {
      bookmarkSeen = true;
      if (requirement === "bookmark" || candidate.cohortDefinitionId !== undefined) {
        return candidate;
      }
    }

    if (attempt < maxAttempts - 1) {
      await wait(pollingDelay(attempt), signal);
    }
  }

  if (requirement === "cohort" && bookmarkSeen) {
    throw new WizardBookmarkResolutionError("Wizard cohort is not ready", "cohort-not-ready");
  }
  throw new WizardBookmarkResolutionError("Wizard bookmark was not found", "bookmark-not-found");
}
