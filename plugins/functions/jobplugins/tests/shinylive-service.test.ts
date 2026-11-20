import "./_setup.ts";
import { assertEquals, assertRejects } from "@std/assert";
import { PrefectAPI } from "../src/api/PrefectAPI.ts";
import {
  ShinyLiveFlowRunDto,
  ShinyLiveService,
} from "../src/services/ShinyLiveService.ts";

type CreateFlowRunCall = { name: string; parameters: any };

/**
 * ShinyLiveService constructs its own PrefectAPI, so the doubles go on the
 * prototypes. The background token clean-up polls every 15 s, so it is
 * replaced too; restore everything however the test ends.
 */
async function withFakePrefect(
  run: (calls: CreateFlowRunCall[]) => Promise<void>,
): Promise<void> {
  const original = {
    createFlowRun: PrefectAPI.prototype.createFlowRun,
    createInputAuthToken: PrefectAPI.prototype.createInputAuthToken,
    revoke: (ShinyLiveService.prototype as any).revokeAuthTokenWhenSettled,
  };
  const calls: CreateFlowRunCall[] = [];
  PrefectAPI.prototype.createFlowRun = ((name: string, _d: string, _f: string, parameters: any) => {
    calls.push({ name, parameters });
    return Promise.resolve("flow-run-1");
  }) as any;
  PrefectAPI.prototype.createInputAuthToken = (() => Promise.resolve()) as any;
  (ShinyLiveService.prototype as any).revokeAuthTokenWhenSettled = () => Promise.resolve();
  try {
    await run(calls);
  } finally {
    PrefectAPI.prototype.createFlowRun = original.createFlowRun;
    PrefectAPI.prototype.createInputAuthToken = original.createInputAuthToken;
    (ShinyLiveService.prototype as any).revokeAuthTokenWhenSettled = original.revoke;
  }
}

const dto = (language: string): ShinyLiveFlowRunDto => ({
  datasetId: "dataset-1",
  language: language as ShinyLiveFlowRunDto["language"],
  appCode: "library(shiny)",
  type: "Dashboard",
  name: "CohortSummary",
});

for (const language of ["python", "r"]) {
  Deno.test(`createShinyLiveFlowRun starts a build for ${language} apps`, async () => {
    await withFakePrefect(async (calls) => {
      const result = await new ShinyLiveService().createShinyLiveFlowRun(
        dto(language),
        "Bearer test-token",
      );

      assertEquals(result, { flowRunId: "flow-run-1" });
      assertEquals(calls.length, 1);
      assertEquals(calls[0].name, `CohortSummary_dataset-1_${language}_Dashboard`);
      assertEquals(calls[0].parameters.options.language, language);
    });
  });
}

Deno.test("createShinyLiveFlowRun rejects other languages without starting a build", async () => {
  await withFakePrefect(async (calls) => {
    await assertRejects(
      () => new ShinyLiveService().createShinyLiveFlowRun(dto("julia"), "Bearer test-token"),
      Error,
      'Language "julia" is not supported',
    );
    assertEquals(calls.length, 0);
  });
});
