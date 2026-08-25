import { beforeEach, describe, expect, it, vi } from "vitest";
import client from "../../axios/request";
import { listAtlasSources, publishAtlasSourceSelection, resolveAtlasSourceKey } from "../atlasSourceApi";

vi.mock("../../axios/request", () => ({
  default: { get: vi.fn() },
}));

const mockedGet = vi.mocked(client.get);

describe("Atlas source API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists valid Atlas data sources with the host token", async () => {
    mockedGet.mockResolvedValue({
      data: [
        {
          sourceId: 17,
          sourceKey: "dataset-1",
          sourceName: "Demo dataset",
          sourceDialect: "postgresql",
        },
      ],
    });

    await expect(listAtlasSources(async () => "token-1")).resolves.toEqual([
      {
        sourceId: 17,
        sourceKey: "dataset-1",
        sourceName: "Demo dataset",
        sourceDialect: "postgresql",
      },
    ]);
    expect(mockedGet).toHaveBeenCalledWith("/WebAPI/source/sources", {
      headers: { Authorization: "Bearer token-1" },
    });
  });

  it("rejects a malformed Atlas source response", async () => {
    mockedGet.mockResolvedValue({ data: { sourceKey: "dataset-1" } });

    await expect(listAtlasSources()).rejects.toThrow("invalid data-source list");
  });

  it("keeps a selected Atlas source when it is present in the source list", () => {
    const sources = [
      { sourceId: 1, sourceKey: "dataset-1", sourceName: "Dataset 1", sourceDialect: "postgresql" },
      { sourceId: 2, sourceKey: "dataset-2", sourceName: "Dataset 2", sourceDialect: "postgresql" },
    ];

    expect(resolveAtlasSourceKey(sources, "dataset-2")).toBe("dataset-2");
  });

  it("falls back to the first Atlas source when no valid selection is available", () => {
    const sources = [
      { sourceId: 1, sourceKey: "dataset-1", sourceName: "Dataset 1", sourceDialect: "postgresql" },
      { sourceId: 2, sourceKey: "dataset-2", sourceName: "Dataset 2", sourceDialect: "postgresql" },
    ];

    expect(resolveAtlasSourceKey(sources)).toBe("dataset-1");
    expect(resolveAtlasSourceKey(sources, "missing-dataset")).toBe("dataset-1");
  });

  it("publishes sourceKey as the Wizard dataset id", () => {
    const setStoredSourceKey = vi.fn();
    const dispatchPropsChange = vi.fn();

    expect(
      publishAtlasSourceSelection("wizards", "dataset-1", {
        setStoredSourceKey,
        dispatchPropsChange,
      }),
    ).toEqual({ appId: "wizards", datasetId: "dataset-1" });
    expect(setStoredSourceKey).toHaveBeenCalledWith("dataset-1");
    expect(dispatchPropsChange).toHaveBeenCalledWith({ appId: "wizards", datasetId: "dataset-1" });
  });
});
