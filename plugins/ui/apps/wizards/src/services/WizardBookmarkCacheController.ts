import { listPatientAnalyticsCohorts, type PatientAnalyticsCohortListItem } from "../api/wizardCohortApi";

export type WizardBookmarkCacheStatus = "idle" | "loading" | "ready" | "error";

export interface WizardBookmarkCacheSnapshot {
  datasetId: string | null;
  status: WizardBookmarkCacheStatus;
  items: PatientAnalyticsCohortListItem[];
  error: Error | null;
}

type ListCohorts = (datasetId: string, signal?: AbortSignal) => Promise<PatientAnalyticsCohortListItem[]>;
type Listener = () => void;

interface ActiveRequest {
  datasetId: string;
  requestId: number;
  controller: AbortController;
  promise: Promise<PatientAnalyticsCohortListItem[]>;
}

const idleSnapshot = (): WizardBookmarkCacheSnapshot => ({
  datasetId: null,
  status: "idle",
  items: [],
  error: null,
});

export class WizardBookmarkCacheController {
  private snapshot = idleSnapshot();
  private activeRequest: ActiveRequest | null = null;
  private requestId = 0;
  private readonly listeners = new Set<Listener>();

  constructor(private readonly listCohorts: ListCohorts = listPatientAnalyticsCohorts) {}

  getSnapshot = (): WizardBookmarkCacheSnapshot => this.snapshot;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  setDataset(datasetId?: string): void {
    if (!datasetId) {
      this.cancelActiveRequest();
      this.updateSnapshot(idleSnapshot());
      return;
    }

    if (this.snapshot.datasetId === datasetId) {
      return;
    }

    void this.startRequest(datasetId, true).catch(() => undefined);
  }

  ensureReady(datasetId: string): Promise<PatientAnalyticsCohortListItem[]> {
    if (this.activeRequest?.datasetId === datasetId) {
      return this.activeRequest.promise;
    }
    if (this.snapshot.datasetId === datasetId && this.snapshot.status === "ready") {
      return Promise.resolve(this.snapshot.items);
    }
    return this.startRequest(datasetId, false);
  }

  refresh(datasetId: string): Promise<PatientAnalyticsCohortListItem[]> {
    return this.startRequest(datasetId, true);
  }

  dispose(): void {
    this.cancelActiveRequest();
    this.listeners.clear();
  }

  private startRequest(datasetId: string, force: boolean): Promise<PatientAnalyticsCohortListItem[]> {
    if (!force && this.activeRequest?.datasetId === datasetId) {
      return this.activeRequest.promise;
    }

    this.cancelActiveRequest();
    const requestId = ++this.requestId;
    const controller = new AbortController();
    this.updateSnapshot({ datasetId, status: "loading", items: [], error: null });

    const promise = this.listCohorts(datasetId, controller.signal)
      .then((items) => {
        if (this.isCurrentRequest(requestId, datasetId)) {
          this.updateSnapshot({ datasetId, status: "ready", items: [...items], error: null });
        }
        return items;
      })
      .catch((error: unknown) => {
        if (this.isCurrentRequest(requestId, datasetId)) {
          const normalizedError = error instanceof Error ? error : new Error("Unable to load Wizard bookmarks");
          this.updateSnapshot({ datasetId, status: "error", items: [], error: normalizedError });
        }
        throw error;
      })
      .finally(() => {
        if (this.isCurrentRequest(requestId, datasetId)) {
          this.activeRequest = null;
        }
      });

    this.activeRequest = { datasetId, requestId, controller, promise };
    return promise;
  }

  private isCurrentRequest(requestId: number, datasetId: string): boolean {
    return this.requestId === requestId && this.snapshot.datasetId === datasetId;
  }

  private cancelActiveRequest(): void {
    if (this.activeRequest) {
      this.activeRequest.controller.abort();
      this.activeRequest = null;
    }
    this.requestId += 1;
  }

  private updateSnapshot(snapshot: WizardBookmarkCacheSnapshot): void {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }
}
