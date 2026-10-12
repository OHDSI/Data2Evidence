import { describe, it } from "jsr:@std/testing@1/bdd";
import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import {
  assertDatasetPrerequisites,
  DatasetPrerequisiteError,
  DatasetPrerequisiteProblem,
  prerequisiteErrorMessage,
} from "./datasetPrerequisites.ts";

// Issue #3201. A CDM schema without cdm_source failed with
// "Error occurred while creating DQD flow run", which names the flow and not the
// missing table — the flow was never submitted. These pin the two things that
// made that hard to diagnose: that the problems reach the caller at all, and
// that a check which cannot run does not block the analysis.

const MISSING: DatasetPrerequisiteProblem = {
  code: "MISSING_TABLE",
  table: "cdm_source",
  message: "cdm_source is missing from db.cdm — the CDM version is read from it.",
};
const EMPTY: DatasetPrerequisiteProblem = {
  code: "EMPTY_TABLE",
  table: "observation_period",
  message: "observation_period in db.cdm has no rows — DQD reports almost nothing.",
};

const apiReturning = (problems: DatasetPrerequisiteProblem[]) => ({
  getDatasetPrerequisiteProblems: () => Promise.resolve(problems),
});

describe("prerequisiteErrorMessage", () => {
  it("is null when there is nothing to report", () => {
    assertEquals(prerequisiteErrorMessage("Data Quality", "ds-1", []), null);
  });

  it("names the analysis, the dataset and the table", () => {
    const message = prerequisiteErrorMessage("Data Quality", "ds-1", [MISSING])!;
    assertEquals(message.includes("Data Quality"), true);
    assertEquals(message.includes("ds-1"), true);
    assertEquals(message.includes("cdm_source"), true);
  });

  it("lists every problem, not just the first", () => {
    // A partial CDM is usually missing several tables, and fixing them one
    // round-trip at a time is the slow version of this.
    const message = prerequisiteErrorMessage("Data Quality", "ds-1", [
      MISSING,
      EMPTY,
    ])!;
    assertEquals(message.includes("cdm_source"), true);
    assertEquals(message.includes("observation_period"), true);
  });
});

describe("assertDatasetPrerequisites", () => {
  it("throws naming the missing table", async () => {
    await assertRejects(
      () => assertDatasetPrerequisites(apiReturning([MISSING]), "Data Quality", "ds-1"),
      Error,
      "cdm_source",
    );
  });

  it("returns for a sound dataset", async () => {
    await assertDatasetPrerequisites(apiReturning([]), "Data Quality", "ds-1");
  });

  it("does not block the analysis when the check itself could not run", async () => {
    // The API reports an unreachable check as an empty list, so a preflight
    // that fails must not stop a run that would otherwise have worked.
    await assertDatasetPrerequisites(apiReturning([]), "Data characterization", "ds-1");
  });
});

describe("DatasetPrerequisiteError", () => {
  it("is tagged as a client error so a controller forwards its message", async () => {
    // The controllers only forward a message when statusCode says the caller
    // caused it; a bare Error is reported as a generic 500, which is the
    // behaviour #3201 is about.
    const thrown = await assertDatasetPrerequisites(
      apiReturning([MISSING]),
      "Data Quality",
      "ds-1",
    ).catch((e) => e);

    assertEquals(thrown instanceof DatasetPrerequisiteError, true);
    assertEquals((thrown as DatasetPrerequisiteError).statusCode, 400);
    assertEquals((thrown as DatasetPrerequisiteError).problems.length, 1);
  });
});
