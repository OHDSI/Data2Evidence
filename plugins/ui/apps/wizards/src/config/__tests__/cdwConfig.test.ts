import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("../../axios/request", () => ({
  default: { get: getMock },
}));

describe("fetchCdwConfig", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("DEV", false);
    getMock.mockReset();
    getMock.mockImplementation((_url, { params }) =>
      Promise.resolve({
        data: {
          config: { datasetMarker: params.datasetId },
          meta: { configId: `config-${params.datasetId}`, configVersion: "1" },
        },
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("caches CDW configuration separately for each dataset", async () => {
    const { fetchCdwConfig } = await import("../cdwConfig");

    const datasetA = await fetchCdwConfig("dataset-a");
    const datasetAAgain = await fetchCdwConfig("dataset-a");
    const datasetB = await fetchCdwConfig("dataset-b");

    expect(datasetAAgain).toBe(datasetA);
    expect(datasetA.meta.configId).toBe("config-dataset-a");
    expect(datasetB.meta.configId).toBe("config-dataset-b");
    expect(getMock).toHaveBeenCalledTimes(2);
  });
});
