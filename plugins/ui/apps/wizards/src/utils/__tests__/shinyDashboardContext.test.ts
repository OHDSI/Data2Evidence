import { describe, expect, it } from "vitest";
import { buildShinyDashboardAuthMessage, buildShinyDashboardIframeUrl } from "../shinyDashboardContext";

describe("Wizards Shiny dashboard context", () => {
  it("matches the established dataset and dashboard-type route", () => {
    expect(buildShinyDashboardIframeUrl("dataset-1", { dashboardType: "table1" })).toBe(
      "/gateway/api/dataset/shiny-live/dataset-1_cohort_table1_python/"
    );
  });

  it("requires both dataset and dashboard type", () => {
    expect(buildShinyDashboardIframeUrl("", { dashboardType: "table1" })).toBe("");
    expect(buildShinyDashboardIframeUrl("dataset-1", null)).toBe("");
  });

  it("builds the existing token and cohort context contract", () => {
    expect(
      buildShinyDashboardAuthMessage({
        token: "secret-token",
        datasetId: "dataset-1",
        cohortId: "42",
        wizardConfig: { dashboardType: "table1", year: { from: 2020, to: 2025 } },
        mriquery: '{"cohortDefinition":{}}',
        timestamp: 123,
      })
    ).toEqual({
      type: "AUTH_TOKEN",
      token: "secret-token",
      timestamp: 123,
      context: {
        datasetId: "dataset-1",
        cohortId: "42",
        wizardConfig: { dashboardType: "table1", year: { from: 2020, to: 2025 } },
        mriquery: '{"cohortDefinition":{}}',
      },
    });
  });

  it("does not fail the auth context for a cyclic Wizard config", () => {
    const wizardConfig: Record<string, unknown> = { dashboardType: "table1" };
    wizardConfig.self = wizardConfig;
    const message = buildShinyDashboardAuthMessage({
      token: "secret-token",
      datasetId: "dataset-1",
      cohortId: "42",
      wizardConfig,
    });

    expect(message.context.wizardConfig).toBeNull();
    expect(message.context.cohortId).toBe("42");
  });
});
