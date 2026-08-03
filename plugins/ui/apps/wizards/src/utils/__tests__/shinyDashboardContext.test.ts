import { describe, expect, it } from "vitest";
import {
  buildShinyDashboardAuthMessage,
  buildShinyDashboardIframeUrl,
  resolveShinyDashboardMessageSource,
} from "../shinyDashboardContext";

function createWindow(children: Window[] = []): Window {
  const window = { frames: children } as unknown as Window;
  children.forEach((child) => {
    Object.defineProperty(child, "parent", { value: window });
  });
  return window;
}

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

  it("accepts readiness messages from the outer ShinyLive iframe", () => {
    const iframeWindow = createWindow();

    expect(resolveShinyDashboardMessageSource(iframeWindow, iframeWindow)).toBe(iframeWindow);
  });

  it("accepts readiness messages from a dashboard nested inside the ShinyLive iframe", () => {
    const dashboardWindow = createWindow();
    const iframeWindow = createWindow([dashboardWindow]);

    expect(resolveShinyDashboardMessageSource(dashboardWindow, iframeWindow)).toBe(dashboardWindow);
  });

  it("rejects messages from a window outside the ShinyLive iframe tree", () => {
    const iframeWindow = createWindow([createWindow()]);
    const unrelatedWindow = createWindow();

    expect(resolveShinyDashboardMessageSource(unrelatedWindow, iframeWindow)).toBeNull();
    expect(resolveShinyDashboardMessageSource(null, iframeWindow)).toBeNull();
  });

  it("rejects messages nested more deeply than the ShinyLive dashboard", () => {
    const nestedWindow = createWindow();
    const dashboardWindow = createWindow([nestedWindow]);
    const iframeWindow = createWindow([dashboardWindow]);

    expect(resolveShinyDashboardMessageSource(nestedWindow, iframeWindow)).toBeNull();
  });
});
