import { describe, expect, it } from "vitest";
import { buildMriBookmark } from "../mriQuery";
import {
  findWizardBookmarkById,
  parseWizardBookmarkCandidates,
  selectBestWizardBookmark,
  type WizardBookmarkScope,
} from "../wizardBookmarkCache";

const scope: WizardBookmarkScope = {
  datasetId: "dataset-1",
  username: "researcher",
  paConfigId: "pa-config",
};
const targetBookmark = buildMriBookmark(
  [],
  {},
  { configId: "mri-config", configVersion: "2" },
  scope.datasetId,
).bookmark;

describe("Wizard bookmark cache selection", () => {
  it("parses an eligible Wizard bookmark", () => {
    const candidates = parseWizardBookmarkCandidates([bookmarkItem()], scope);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      bmkId: "bookmark-1",
      bookmarkname: "wizards-1783670400000",
      userId: "researcher",
      shared: false,
      paConfigId: "pa-config",
    });
    expect(candidates[0].queryIdentity).toBeTruthy();
  });

  it.each([
    ["manual name", { bookmarkname: "My cohort" }],
    ["non-timestamp prefix", { bookmarkname: "wizards-test" }],
    ["uppercase prefix", { bookmarkname: "Wizards-1783670400000" }],
    ["extra suffix", { bookmarkname: "wizards-1783670400000-copy" }],
    ["short timestamp", { bookmarkname: "wizards-123" }],
    ["shared bookmark", { shared: true }],
    ["other owner", { user_id: "other-user" }],
    ["other PA config", { paConfigId: "other-pa-config" }],
    ["malformed bookmark", { bookmark: "not-json" }],
    ["missing bookmark id", { bmkId: "" }],
  ])("ignores a %s", (_label, overrides) => {
    expect(parseWizardBookmarkCandidates([bookmarkItem(overrides)], scope)).toEqual([]);
  });

  it("allows a bookmark when the API omits its optional PA config id", () => {
    const item = bookmarkItem();
    delete item.paConfigId;

    expect(parseWizardBookmarkCandidates([item], scope)).toHaveLength(1);
  });

  it("allows any valid candidate PA config when the active scope omits one", () => {
    const scopeWithoutPaConfig = { datasetId: scope.datasetId, username: scope.username };

    expect(parseWizardBookmarkCandidates([bookmarkItem()], scopeWithoutPaConfig)).toHaveLength(1);
  });

  it("ignores bookmarks from another dataset", () => {
    const otherDatasetBookmark = { ...targetBookmark, datasetId: "dataset-2" };

    expect(
      parseWizardBookmarkCandidates([bookmarkItem({ bookmark: JSON.stringify(otherDatasetBookmark) })], scope),
    ).toEqual([]);
  });

  it("ignores non-bookmark items in the combined cohort list", () => {
    const combinedList = [
      { id: 42, cohortDefinitionName: "Materialized cohort", patientCount: 10 },
      { id: 9, name: "Atlas definition", createdDate: 1234 },
      bookmarkItem(),
    ];

    expect(parseWizardBookmarkCandidates(combinedList, scope)).toHaveLength(1);
  });

  it("finds an eligible bookmark by its backend id", () => {
    const selected = findWizardBookmarkById(
      [bookmarkItem(), bookmarkItem({ bmkId: "bookmark-2", bookmarkname: "wizards-1783670400001" })],
      scope,
      "bookmark-2",
    );

    expect(selected?.bmkId).toBe("bookmark-2");
    expect(findWizardBookmarkById([bookmarkItem()], scope, "missing")).toBeNull();
  });

  it("selects a matching materialized bookmark over a newer unmaterialized duplicate", () => {
    const selected = selectBestWizardBookmark(
      [
        bookmarkItem({
          bmkId: "new-unmaterialized",
          bookmarkname: "wizards-1783670400001",
          modified: "2026-07-10T12:00:00.000Z",
        }),
        bookmarkItem({
          bmkId: "old-materialized",
          bookmarkname: "wizards-1783670400002",
          modified: "2026-07-09T12:00:00.000Z",
          cohortDefinitionId: 123,
        }),
      ],
      scope,
      targetBookmark,
    );

    expect(selected).toMatchObject({ bmkId: "old-materialized", cohortDefinitionId: 123 });
  });

  it("selects the newest bookmark when materialization status is equal", () => {
    const selected = selectBestWizardBookmark(
      [
        bookmarkItem({
          bmkId: "older",
          bookmarkname: "wizards-1783670400001",
          modified: "2026-07-09T12:00:00.000Z",
          cohortDefinitionId: 123,
        }),
        bookmarkItem({
          bmkId: "newer",
          bookmarkname: "wizards-1783670400002",
          modified: "2026-07-10T12:00:00.000Z",
          cohortDefinitionId: 456,
        }),
      ],
      scope,
      targetBookmark,
    );

    expect(selected).toMatchObject({ bmkId: "newer", cohortDefinitionId: 456 });
  });

  it("returns no match when the query differs or is invalid", () => {
    const changedQuery = { ...targetBookmark, datasetId: "dataset-2" };

    expect(selectBestWizardBookmark([bookmarkItem()], scope, changedQuery)).toBeNull();
    expect(selectBestWizardBookmark([bookmarkItem()], scope, "not-json")).toBeNull();
  });
});

function bookmarkItem(overrides: Record<string, unknown> = {}) {
  return {
    bmkId: "bookmark-1",
    bookmarkname: "wizards-1783670400000",
    bookmark: JSON.stringify(targetBookmark),
    modified: "2026-07-10T10:00:00.000Z",
    user_id: "researcher",
    shared: false,
    paConfigId: "pa-config",
    ...overrides,
  };
}
