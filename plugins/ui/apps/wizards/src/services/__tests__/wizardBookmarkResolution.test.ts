import { describe, expect, it, vi } from "vitest";
import { buildMriBookmark } from "../../utils/mriQuery";
import type { WizardBookmarkScope } from "../../utils/wizardBookmarkCache";
import {
  findWizardBookmarkByName,
  pollForWizardBookmark,
  WizardBookmarkResolutionError,
} from "../wizardBookmarkResolution";

const scope: WizardBookmarkScope = {
  datasetId: "dataset-1",
  username: "researcher",
  paConfigId: "pa-config",
};
const bookmark = buildMriBookmark([], {}, { configId: "mri-config", configVersion: "2" }, "dataset-1").bookmark;

describe("Wizard bookmark resolution", () => {
  it("finds an eligible bookmark by exact generated name", () => {
    const selected = findWizardBookmarkByName(
      [bookmarkItem(), bookmarkItem({ bmkId: "other", bookmarkname: "wizards-1783670400001" })],
      scope,
      "wizards-1783670400000"
    );

    expect(selected?.bmkId).toBe("bookmark-1");
  });

  it("polls until the bookmark has a cohort definition id", async () => {
    const refresh = vi
      .fn()
      .mockResolvedValueOnce([bookmarkItem()])
      .mockResolvedValueOnce([bookmarkItem({ cohortDefinitionId: 42 })]);
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(
      pollForWizardBookmark({
        refresh,
        scope,
        bookmarkName: "wizards-1783670400000",
        requirement: "cohort",
        maxAttempts: 3,
        wait,
      })
    ).resolves.toMatchObject({ bmkId: "bookmark-1", cohortDefinitionId: 42 });
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledTimes(1);
  });

  it("returns an unmaterialized bookmark when only bookmark resolution is required", async () => {
    const refresh = vi.fn().mockResolvedValue([bookmarkItem()]);

    const selected = await pollForWizardBookmark({
      refresh,
      scope,
      bookmarkName: "wizards-1783670400000",
      requirement: "bookmark",
    });

    expect(selected.bmkId).toBe("bookmark-1");
    expect(selected.cohortDefinitionId).toBeUndefined();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("reports a cohort timeout separately from a missing bookmark", async () => {
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(
      pollForWizardBookmark({
        refresh: vi.fn().mockResolvedValue([bookmarkItem()]),
        scope,
        bookmarkName: "wizards-1783670400000",
        requirement: "cohort",
        maxAttempts: 2,
        wait,
      })
    ).rejects.toMatchObject({ code: "cohort-not-ready" });

    await expect(
      pollForWizardBookmark({
        refresh: vi.fn().mockResolvedValue([]),
        scope,
        bookmarkName: "wizards-1783670400000",
        requirement: "bookmark",
        maxAttempts: 2,
        wait,
      })
    ).rejects.toMatchObject({ code: "bookmark-not-found" });
  });

  it("cancels before another refresh when the signal aborts", async () => {
    const controller = new AbortController();
    const refresh = vi.fn().mockResolvedValue([]);
    const wait = vi.fn(async () => controller.abort());

    let caught: unknown;
    try {
      await pollForWizardBookmark({
        refresh,
        scope,
        bookmarkName: "wizards-1783670400000",
        requirement: "bookmark",
        maxAttempts: 3,
        signal: controller.signal,
        wait,
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(WizardBookmarkResolutionError);
    expect(caught).toMatchObject({ code: "cancelled" });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

function bookmarkItem(overrides: Record<string, unknown> = {}) {
  return {
    bmkId: "bookmark-1",
    bookmarkname: "wizards-1783670400000",
    bookmark: JSON.stringify(bookmark),
    modified: "2026-07-10T10:00:00.000Z",
    user_id: "researcher",
    shared: false,
    paConfigId: "pa-config",
    ...overrides,
  };
}
