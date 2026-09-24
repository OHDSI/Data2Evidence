import "./_setup.ts";
import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import { AnalyticsSvcAPI } from "../src/api/AnalyticsAPI.ts";
import { PortalServerAPI } from "../src/api/PortalServerAPI.ts";
import { PrefectAPI } from "../src/api/PrefectAPI.ts";
import { DqdService } from "../src/services/DqdService.ts";

const originalPollFlowRunCompletion =
  PrefectAPI.prototype.pollFlowRunCompletion;
const originalGetFlowRunsArtifactsByFlowRunId =
  PrefectAPI.prototype.getFlowRunsArtifactsByFlowRunId;

/**
 * DqdService constructs its own PrefectAPI rather than taking one, so the
 * doubles go on the prototype; restore them however the test ends.
 */
async function withArtifact(
  artifact: unknown,
  run: () => Promise<void>,
): Promise<void> {
  PrefectAPI.prototype.pollFlowRunCompletion = () =>
    Promise.resolve({ flowRunId: "completed-flow-run" });
  PrefectAPI.prototype.getFlowRunsArtifactsByFlowRunId = () =>
    Promise.resolve([{ data: JSON.stringify(artifact) }]);
  try {
    await run();
  } finally {
    PrefectAPI.prototype.pollFlowRunCompletion = originalPollFlowRunCompletion;
    PrefectAPI.prototype.getFlowRunsArtifactsByFlowRunId =
      originalGetFlowRunsArtifactsByFlowRunId;
  }
}

Deno.test("getDataQualityOverview adds DQD run metadata to the existing overview response", async () => {
  await withArtifact(
    {
      startTimestamp: ["2026-08-18 01:02:03"],
      endTimestamp: ["2026-08-18 03:02:03"],
      executionTime: ["2 hours"],
      executionTimeSeconds: [7200],
      Metadata: [
        {
          cdmReleaseDate: "2026-08-01",
          dqdVersion: "2.8.0",
        },
      ],
      Overview: {},
      CheckResults: [],
    },
    async () => {
      const result = await new DqdService().getDataQualityOverview(
        "requested-flow-run",
        "Bearer test-token",
      );

      assertEquals(result?.timing, {
        startTimestamp: "2026-08-18 01:02:03",
        endTimestamp: "2026-08-18 03:02:03",
        executionTime: "2 hours",
        executionTimeSeconds: 7200,
      });
      assertEquals(result?.dqdVersion, "2.8.0");
      assertEquals(Object.hasOwn(result!, "total"), true);
      assertEquals(Object.hasOwn(result!, "validation"), true);
      assertEquals(Object.hasOwn(result!, "verification"), true);
    },
  );
});

Deno.test("getDataQualityOverview omits metadata keys when an older artifact does not contain them", async () => {
  await withArtifact(
    {
      Metadata: [{ cdmReleaseDate: "2026-08-01" }],
      Overview: {},
      CheckResults: [],
    },
    async () => {
      const result = await new DqdService().getDataQualityOverview(
        "requested-flow-run",
        "Bearer test-token",
      );

      assertEquals(Object.keys(result!).sort(), [
        "total",
        "validation",
        "verification",
      ]);
    },
  );
});

/**
 * createDataQualityFlowRun's own path to Prefect: stubs every collaborator it
 * touches before the createFlowRun call (dataset lookup, the trex-vs-source
 * Variable, CDM version) and hands back the `parameters` createFlowRun was
 * called with, so a test can assert what actually reached Prefect.
 */
async function withCreateFlowRunCapture(
  run: (getCapturedParameters: () => unknown) => Promise<void>,
): Promise<void> {
  let capturedParameters: unknown;

  const datasetStub = stub(
    PortalServerAPI.prototype,
    "getDataset",
    () =>
      Promise.resolve({
        databaseCode: "db1",
        schemaName: "cdm",
        vocabSchemaName: "vocab",
        resultsSchemaName: "results",
        dialect: "postgres",
      } as never),
  );
  const variableStub = stub(
    PrefectAPI.prototype,
    "getVariableValue",
    () => Promise.resolve(undefined),
  );
  const cdmVersionStub = stub(
    AnalyticsSvcAPI.prototype,
    "getCdmVersion",
    () => Promise.resolve("5.4.0"),
  );
  const createFlowRunStub = stub(
    PrefectAPI.prototype,
    "createFlowRun",
    (_name: string, _deploymentName: string, _flowName: string, parameters: object) => {
      capturedParameters = parameters;
      return Promise.resolve("created-flow-run-id");
    },
  );
  const authTokenStub = stub(
    PrefectAPI.prototype,
    "createInputAuthToken",
    () => Promise.resolve(undefined as never),
  );

  try {
    await run(() => capturedParameters);
  } finally {
    datasetStub.restore();
    variableStub.restore();
    cdmVersionStub.restore();
    createFlowRunStub.restore();
    authTokenStub.restore();
  }
}

// sanitizeOps/Resources off: createDataQualityFlowRun fires a real 5-minute
// setTimeout to clean up the flow run's input auth token (Promise.any([new
// Promise(() => setTimeout(...))]) -- unawaited by design). That's a pre-existing
// property of the method these tests aren't exercising, not something the
// timeout-forwarding change under test should have to defeat.
Deno.test({
  name: "createDataQualityFlowRun forwards an explicit taskTimeoutSeconds to the Prefect flow-run parameters",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await withCreateFlowRunCapture(async (getCapturedParameters) => {
      await new DqdService().createDataQualityFlowRun(
        { datasetId: "3f2504e0-4f89-11d3-9a0c-0305e82c3301", taskTimeoutSeconds: 3600 },
        "Bearer test-token",
      );

      const parameters = getCapturedParameters() as { options: { taskTimeoutSeconds?: number } };
      assertEquals(parameters.options.taskTimeoutSeconds, 3600);
    });
  },
});

Deno.test({
  name: "createDataQualityFlowRun omits taskTimeoutSeconds when not provided, preserving the flow's own default",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await withCreateFlowRunCapture(async (getCapturedParameters) => {
      await new DqdService().createDataQualityFlowRun(
        { datasetId: "3f2504e0-4f89-11d3-9a0c-0305e82c3301" },
        "Bearer test-token",
      );

      const parameters = getCapturedParameters() as { options: object };
      assertEquals(Object.hasOwn(parameters.options, "taskTimeoutSeconds"), false);
    });
  },
});
