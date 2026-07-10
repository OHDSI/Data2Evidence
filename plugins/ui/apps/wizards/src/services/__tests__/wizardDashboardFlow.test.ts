import { describe, expect, it, vi } from "vitest";
import { buildMriBookmark } from "../../utils/mriQuery";
import type { WizardBookmarkCandidate } from "../../utils/wizardBookmarkCache";
import { createWizardBookmarkName, runWizardDashboardFlow } from "../wizardDashboardFlow";

const datasetId = "dataset-1";
const bookmark = buildMriBookmark([], {}, { configId: "mri-config", configVersion: "2" }, datasetId).bookmark;
const baseInput = {
  datasetId,
  username: "researcher",
  paConfigId: "pa-config",
  cdmConfigId: "cdm-config",
  cdmConfigVersion: "3",
  bookmark,
  wizardConfig: { dashboardType: "incidence" },
};

describe("Wizard dashboard flow", () => {
  it("reuses a materialized match without any writes", async () => {
    const createBookmark = vi.fn();
    const materializeBookmark = vi.fn();

    const result = await runWizardDashboardFlow(baseInput, {
      ensureCache: vi.fn().mockResolvedValue([bookmarkItem({ cohortDefinitionId: 42 })]),
      refreshCache: vi.fn(),
      createBookmark,
      materializeBookmark,
    });

    expect(result).toMatchObject({ bookmarkId: "bookmark-1", cohortId: 42, cacheOutcome: "hit-ready" });
    expect(JSON.parse(result.mriquery)).toMatchObject({ datasetId: "dataset-1" });
    expect(createBookmark).not.toHaveBeenCalled();
    expect(materializeBookmark).not.toHaveBeenCalled();
  });

  it("materializes one existing unmaterialized match without saving", async () => {
    const createBookmark = vi.fn();
    const materializeBookmark = vi.fn().mockResolvedValue(undefined);
    const poll = vi.fn().mockResolvedValue(candidate({ cohortDefinitionId: 42 }));

    const result = await runWizardDashboardFlow(baseInput, {
      ensureCache: vi.fn().mockResolvedValue([bookmarkItem()]),
      refreshCache: vi.fn(),
      createBookmark,
      materializeBookmark,
      poll,
    });

    expect(createBookmark).not.toHaveBeenCalled();
    expect(materializeBookmark).toHaveBeenCalledTimes(1);
    expect(result.cacheOutcome).toBe("hit-unmaterialized");
    expect(poll).toHaveBeenCalledWith(expect.objectContaining({ requirement: "cohort" }));
  });

  it("refreshes, saves once, then materializes once on a cache miss", async () => {
    const createBookmark = vi.fn().mockResolvedValue(undefined);
    const materializeBookmark = vi.fn().mockResolvedValue(undefined);
    const poll = vi
      .fn()
      .mockResolvedValueOnce(candidate())
      .mockResolvedValueOnce(candidate({ cohortDefinitionId: 42 }));
    const stages: string[] = [];

    const result = await runWizardDashboardFlow(baseInput, {
      ensureCache: vi.fn().mockResolvedValue([]),
      refreshCache: vi.fn().mockResolvedValue([]),
      createBookmark,
      materializeBookmark,
      poll,
      now: () => 1783670400000,
      onStage: (stage) => stages.push(stage),
    });

    expect(result.cohortId).toBe(42);
    expect(result.cacheOutcome).toBe("miss");
    expect(createBookmark).toHaveBeenCalledTimes(1);
    expect(materializeBookmark).toHaveBeenCalledTimes(1);
    expect(poll).toHaveBeenNthCalledWith(1, expect.objectContaining({ requirement: "bookmark" }));
    expect(poll).toHaveBeenNthCalledWith(2, expect.objectContaining({ requirement: "cohort" }));
    expect(stages).toEqual([
      "awaiting-cache",
      "saving-bookmark",
      "materializing",
      "resolving-cohort",
      "opening-dashboard",
    ]);
  });

  it("reuses an exact pending name on retry instead of saving again", async () => {
    const pendingBookmarkName = "wizards-1783670400000";
    const createBookmark = vi.fn();

    const result = await runWizardDashboardFlow(
      { ...baseInput, pendingBookmarkName },
      {
        ensureCache: vi.fn().mockResolvedValue([]),
        refreshCache: vi
          .fn()
          .mockResolvedValue([bookmarkItem({ bookmarkname: pendingBookmarkName, cohortDefinitionId: 9 })]),
        createBookmark,
      }
    );

    expect(result.cohortId).toBe(9);
    expect(createBookmark).not.toHaveBeenCalled();
  });

  it("stops before materialization when saving fails", async () => {
    const materializeBookmark = vi.fn();

    await expect(
      runWizardDashboardFlow(baseInput, {
        ensureCache: vi.fn().mockResolvedValue([]),
        refreshCache: vi.fn().mockResolvedValue([]),
        createBookmark: vi.fn().mockRejectedValue(new Error("save failed")),
        materializeBookmark,
        now: () => 1783670400000,
      })
    ).rejects.toThrow("save failed");
    expect(materializeBookmark).not.toHaveBeenCalled();
  });

  it("polls without a second materialization after a submitted cohort is still associating", async () => {
    const materializeBookmark = vi.fn();
    const poll = vi.fn().mockResolvedValue(candidate({ cohortDefinitionId: 42 }));

    await runWizardDashboardFlow(
      { ...baseInput, materializationSubmittedForBookmarkId: "bookmark-1" },
      {
        ensureCache: vi.fn().mockResolvedValue([bookmarkItem()]),
        refreshCache: vi.fn(),
        materializeBookmark,
        poll,
      }
    );

    expect(materializeBookmark).not.toHaveBeenCalled();
    expect(poll).toHaveBeenCalledWith(expect.objectContaining({ requirement: "cohort" }));
  });

  it("generates only the strict timestamp bookmark format", () => {
    expect(createWizardBookmarkName(1783670400000)).toBe("wizards-1783670400000");
    expect(() => createWizardBookmarkName(123)).toThrow();
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

function candidate(overrides: Partial<WizardBookmarkCandidate> = {}): WizardBookmarkCandidate {
  return {
    bmkId: "bookmark-1",
    bookmarkname: "wizards-1783670400000",
    bookmark,
    modified: "2026-07-10T10:00:00.000Z",
    modifiedAt: Date.parse("2026-07-10T10:00:00.000Z"),
    userId: "researcher",
    shared: false,
    paConfigId: "pa-config",
    queryIdentity: "identity",
    ...overrides,
  };
}
