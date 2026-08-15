import "./_setup.ts";
import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import dataSource from "../src/db/datasource.ts";
import StrategusAnalysisService from "../src/analysis/services.ts";
import { PortalAPI } from "../src/api/PortalAPI.ts";

interface FakeRepo {
  find: () => Promise<unknown[]>;
  findOne: (opts: unknown) => Promise<unknown>;
}

/**
 * Build a service backed by a fake repository. The getRepository stub must be
 * active during construction, since the constructor caches the repository.
 */
function serviceWithRepo(repo: Partial<FakeRepo>): StrategusAnalysisService {
  const repoStub = stub(dataSource, "getRepository", () => repo as never);
  try {
    return new StrategusAnalysisService();
  } finally {
    repoStub.restore();
  }
}

Deno.test("getAllAnalysis enriches each record with tokenStudyCode", async () => {
  const service = serviceWithRepo({
    find: () => Promise.resolve([{ id: "a1", datasetId: "d1" }]),
  });
  const portalStub = stub(
    PortalAPI.prototype,
    "getDataset",
    () => Promise.resolve({ tokenStudyCode: "STUDY_1" }),
  );

  try {
    const result = await service.getAllAnalysis("Bearer test-token");
    assertEquals(result, [
      { id: "a1", datasetId: "d1", tokenStudyCode: "STUDY_1" },
    ]);
  } finally {
    portalStub.restore();
  }
});

Deno.test("getAllAnalysis degrades to tokenStudyCode: null when portal lookup fails", async () => {
  const service = serviceWithRepo({
    find: () => Promise.resolve([{ id: "a1", datasetId: "d1" }]),
  });
  const portalStub = stub(
    PortalAPI.prototype,
    "getDataset",
    () => Promise.reject(new Error("portal down")),
  );

  try {
    const result = await service.getAllAnalysis("Bearer test-token");
    assertEquals(result, [
      { id: "a1", datasetId: "d1", tokenStudyCode: null },
    ]);
  } finally {
    portalStub.restore();
  }
});

Deno.test("getStudyAnalysis returns null for an unknown studyId", async () => {
  const service = serviceWithRepo({ findOne: () => Promise.resolve(null) });
  assertEquals(await service.getStudyAnalysis("nope", "Bearer test-token"), null);
});

Deno.test("getAnalysisByDatasetId queries by datasetId and returns the record", async () => {
  let receivedQuery: unknown = null;
  const service = serviceWithRepo({
    findOne: (opts: unknown) => {
      receivedQuery = opts;
      return Promise.resolve({ id: "a1", datasetId: "d1" });
    },
  });

  const result = await service.getAnalysisByDatasetId("d1");

  assertEquals(result, { id: "a1", datasetId: "d1" });
  assertEquals(receivedQuery, { where: { datasetId: "d1" } });
});
