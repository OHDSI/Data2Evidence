import "./_setup.ts";
import { assertEquals } from "@std/assert";
import { createMockRequest } from "../../_shared/testing/http-doubles.ts";
import { runValidators } from "../../_shared/testing/validator-helpers.ts";
import {
  validateDataQualityDatasetId,
  validateDataQualityFlowRunDto,
} from "../src/middlewares/DqdRequestValidatorMiddlewares.ts";

const VALID_UUID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

Deno.test("validateDataQualityFlowRunDto accepts a valid UUID datasetId", async () => {
  const req = createMockRequest({ body: { datasetId: VALID_UUID } });
  assertEquals(await runValidators(validateDataQualityFlowRunDto(), req), []);
});

Deno.test("validateDataQualityFlowRunDto rejects a non-UUID datasetId", async () => {
  const req = createMockRequest({ body: { datasetId: "not-a-uuid" } });
  assertEquals(await runValidators(validateDataQualityFlowRunDto(), req), [
    "datasetId must be a valid UUID",
  ]);
});

Deno.test("validateDataQualityFlowRunDto rejects a missing datasetId", async () => {
  const req = createMockRequest({ body: {} });
  assertEquals(await runValidators(validateDataQualityFlowRunDto(), req), [
    "datasetId must be a valid UUID",
  ]);
});

Deno.test("validateDataQualityFlowRunDto accepts every optional field when well-typed", async () => {
  const req = createMockRequest({
    body: {
      datasetId: VALID_UUID,
      comment: "nightly run",
      resultsSchemaName: "results",
      vocabSchemaName: "vocab",
      releaseId: "12",
      cohortDefinitionId: "34",
    },
  });
  assertEquals(await runValidators(validateDataQualityFlowRunDto(), req), []);
});

Deno.test("validateDataQualityFlowRunDto rejects a non-string comment", async () => {
  const req = createMockRequest({ body: { datasetId: VALID_UUID, comment: 42 } });
  assertEquals(await runValidators(validateDataQualityFlowRunDto(), req), [
    "comment must be a string",
  ]);
});

Deno.test("validateDataQualityFlowRunDto reports every badly-typed optional field", async () => {
  const req = createMockRequest({
    body: {
      datasetId: VALID_UUID,
      resultsSchemaName: 1,
      vocabSchemaName: 2,
      releaseId: 3,
      cohortDefinitionId: 4,
    },
  });
  assertEquals(await runValidators(validateDataQualityFlowRunDto(), req), [
    "resultsSchemaName must be a string",
    "vocabSchemaName must be a string",
    "releaseId must be a string",
    "cohortDefinitionId must be a string",
  ]);
});

Deno.test("validateDataQualityDatasetId accepts a valid UUID query param", async () => {
  const req = createMockRequest({ query: { datasetId: VALID_UUID } });
  assertEquals(await runValidators(validateDataQualityDatasetId(), req), []);
});

// Characterizes a production quirk. The chain is
// `query("datasetId").isUUID().notEmpty().withMessage("datasetId is required and
// must be a valid UUID")`, and express-validator applies `withMessage` only to
// the immediately preceding validator (`notEmpty`). A present-but-malformed
// datasetId therefore fails `isUUID` with the default "Invalid value" and never
// surfaces the intended message. See the report note on this.
Deno.test("validateDataQualityDatasetId rejects a non-UUID query param with the default message", async () => {
  const req = createMockRequest({ query: { datasetId: "bad" } });
  assertEquals(await runValidators(validateDataQualityDatasetId(), req), [
    "Invalid value",
  ]);
});

Deno.test("validateDataQualityDatasetId rejects a missing query param", async () => {
  const req = createMockRequest({ query: {} });
  assertEquals(await runValidators(validateDataQualityDatasetId(), req), [
    "Invalid value",
    "datasetId is required and must be a valid UUID",
  ]);
});
