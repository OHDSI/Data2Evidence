import { describe, expect, it, vi } from "vitest";
import { WizardBookmarkCacheController } from "../WizardBookmarkCacheController";

describe("WizardBookmarkCacheController", () => {
  it("starts a non-blocking dataset load and shares the in-flight promise", async () => {
    const pending = deferred<Record<string, unknown>[]>();
    const list = vi.fn().mockReturnValue(pending.promise);
    const controller = new WizardBookmarkCacheController(list);

    controller.setDataset("dataset-1");

    expect(controller.getSnapshot()).toMatchObject({ datasetId: "dataset-1", status: "loading", items: [] });
    const firstWait = controller.ensureReady("dataset-1");
    const secondWait = controller.ensureReady("dataset-1");
    expect(firstWait).toBe(secondWait);
    expect(list).toHaveBeenCalledTimes(1);

    pending.resolve([{ bmkId: "bookmark-1" }]);
    await expect(firstWait).resolves.toEqual([{ bmkId: "bookmark-1" }]);
    expect(controller.getSnapshot()).toMatchObject({ datasetId: "dataset-1", status: "ready" });
  });

  it("clears the old dataset immediately and ignores its late response", async () => {
    const datasetA = deferred<Record<string, unknown>[]>();
    const datasetB = deferred<Record<string, unknown>[]>();
    const list = vi.fn((datasetId: string) => (datasetId === "dataset-a" ? datasetA.promise : datasetB.promise));
    const controller = new WizardBookmarkCacheController(list);

    controller.setDataset("dataset-a");
    controller.setDataset("dataset-b");
    expect(controller.getSnapshot()).toMatchObject({ datasetId: "dataset-b", status: "loading", items: [] });

    datasetB.resolve([{ bmkId: "bookmark-b" }]);
    await controller.ensureReady("dataset-b");
    datasetA.resolve([{ bmkId: "bookmark-a" }]);
    await Promise.resolve();

    expect(controller.getSnapshot()).toEqual({
      datasetId: "dataset-b",
      status: "ready",
      items: [{ bmkId: "bookmark-b" }],
      error: null,
    });
  });

  it("aborts the previous request on dataset change", () => {
    const signals: AbortSignal[] = [];
    const list = vi.fn((_datasetId: string, signal?: AbortSignal) => {
      if (signal) signals.push(signal);
      return new Promise<Record<string, unknown>[]>(() => undefined);
    });
    const controller = new WizardBookmarkCacheController(list);

    controller.setDataset("dataset-a");
    controller.setDataset("dataset-b");

    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it("exposes an error and retries only when requested", async () => {
    const list = vi
      .fn()
      .mockRejectedValueOnce(new Error("first failure"))
      .mockResolvedValueOnce([{ bmkId: "bookmark-1" }]);
    const controller = new WizardBookmarkCacheController(list);

    controller.setDataset("dataset-1");
    await waitForMicrotasks();
    expect(controller.getSnapshot()).toMatchObject({ datasetId: "dataset-1", status: "error" });
    expect(list).toHaveBeenCalledTimes(1);

    await expect(controller.ensureReady("dataset-1")).resolves.toEqual([{ bmkId: "bookmark-1" }]);
    expect(list).toHaveBeenCalledTimes(2);
    expect(controller.getSnapshot()).toMatchObject({ status: "ready", error: null });
  });

  it("returns ready data without refetching and refreshes atomically on demand", async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce([{ bmkId: "first" }])
      .mockResolvedValueOnce([{ bmkId: "refreshed" }]);
    const controller = new WizardBookmarkCacheController(list);

    await controller.ensureReady("dataset-1");
    await expect(controller.ensureReady("dataset-1")).resolves.toEqual([{ bmkId: "first" }]);
    expect(list).toHaveBeenCalledTimes(1);

    const refresh = controller.refresh("dataset-1");
    expect(controller.getSnapshot()).toMatchObject({ status: "loading", items: [] });
    await refresh;
    expect(controller.getSnapshot()).toMatchObject({ status: "ready", items: [{ bmkId: "refreshed" }] });
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("notifies subscribers and resets when no dataset is active", async () => {
    const listener = vi.fn();
    const controller = new WizardBookmarkCacheController(async () => []);
    const unsubscribe = controller.subscribe(listener);

    await controller.ensureReady("dataset-1");
    controller.setDataset(undefined);

    expect(listener).toHaveBeenCalled();
    expect(controller.getSnapshot()).toEqual({ datasetId: null, status: "idle", items: [], error: null });
    unsubscribe();
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function waitForMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}
