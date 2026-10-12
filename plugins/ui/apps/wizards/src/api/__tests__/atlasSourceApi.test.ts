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

  const source = (sourceId: number, sourceKey: string) => ({
    sourceId,
    sourceKey,
    sourceName: `Dataset ${sourceId}`,
    sourceDialect: "postgresql",
  });

  const mockResponses = (sources: unknown, roles: unknown) => {
    mockedGet.mockImplementation(async (url: string) => {
      if (url === "/WebAPI/source/sources") return { data: sources };
      if (url === "/usermgmt/api/me/roles") return { data: roles };
      throw new Error(`Unexpected URL ${url}`);
    });
  };

  it("lists valid Atlas data sources with the host token", async () => {
    mockResponses([source(17, "dataset-1")], {
      datasetRoles: [{ datasetId: "dataset-1", role: "STUDY_RESEARCHER" }],
    });

    await expect(listAtlasSources(async () => "token-1")).resolves.toEqual([source(17, "dataset-1")]);
    expect(mockedGet).toHaveBeenCalledWith("/WebAPI/source/sources", {
      headers: { Authorization: "Bearer token-1" },
    });
    expect(mockedGet).toHaveBeenCalledWith("/usermgmt/api/me/roles", {
      headers: { Authorization: "Bearer token-1" },
    });
  });

  it("lists only the data sources the user has researcher access to", async () => {
    mockResponses([source(1, "dataset-1"), source(2, "dataset-2"), source(3, "dataset-3")], {
      datasetRoles: [
        { datasetId: "dataset-1", role: "STUDY_RESEARCHER" },
        { datasetId: "dataset-3", role: "STUDY_RESEARCHER" },
      ],
    });

    await expect(listAtlasSources()).resolves.toEqual([source(1, "dataset-1"), source(3, "dataset-3")]);
  });

  it("ignores dataset roles other than researcher", async () => {
    mockResponses([source(1, "dataset-1")], {
      datasetRoles: [{ datasetId: "dataset-1", role: "SOMETHING_ELSE" }],
    });

    await expect(listAtlasSources()).resolves.toEqual([]);
  });

  it("lists no data sources when the user has no dataset roles", async () => {
    mockResponses([source(1, "dataset-1")], { datasetRoles: [] });

    await expect(listAtlasSources()).resolves.toEqual([]);
  });

  it("rejects when the user roles cannot be loaded", async () => {
    mockedGet.mockImplementation(async (url: string) => {
      if (url === "/WebAPI/source/sources") return { data: [source(1, "dataset-1")] };
      throw new Error("403");
    });

    await expect(listAtlasSources()).rejects.toThrow("403");
  });

  it("rejects a malformed user roles response", async () => {
    mockResponses([source(1, "dataset-1")], { roles: [] });

    await expect(listAtlasSources()).rejects.toThrow("invalid user roles");
  });

  it("rejects a malformed Atlas source response", async () => {
    mockResponses({ sourceKey: "dataset-1" }, { datasetRoles: [] });

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
