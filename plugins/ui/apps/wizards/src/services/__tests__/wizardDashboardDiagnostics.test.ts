import { describe, expect, it, vi } from "vitest";
import { logWizardDashboardDiagnostic } from "../wizardDashboardDiagnostics";

describe("Wizard dashboard diagnostics", () => {
  it("emits only allowlisted completion metadata", () => {
    const logger = { info: vi.fn(), warn: vi.fn() };
    const diagnostic = {
      event: "complete",
      operationId: 7,
      elapsedMs: 12.6,
      cacheOutcome: "hit-ready",
      token: "must-not-be-logged",
      bookmark: { patientData: true },
    } as const;

    logWizardDashboardDiagnostic(diagnostic, logger);

    expect(logger.info).toHaveBeenCalledWith("[Wizards dashboard]", {
      event: "complete",
      operationId: 7,
      elapsedMs: 13,
      cacheOutcome: "hit-ready",
    });
  });

  it("reports a failure category without the error object", () => {
    const logger = { info: vi.fn(), warn: vi.fn() };

    logWizardDashboardDiagnostic(
      { event: "failed", operationId: 8, elapsedMs: 20, failedStage: "materializing" },
      logger
    );

    expect(logger.warn).toHaveBeenCalledWith("[Wizards dashboard]", {
      event: "failed",
      operationId: 8,
      elapsedMs: 20,
      failedStage: "materializing",
    });
  });
});
