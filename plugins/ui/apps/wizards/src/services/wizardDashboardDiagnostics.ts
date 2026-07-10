import type { WizardDashboardResult, WizardDashboardStatus } from "./wizardDashboardState";

type FailureStage = Exclude<WizardDashboardStatus, "idle" | "ready" | "error">;

export type WizardDashboardDiagnostic =
  | {
      event: "complete";
      operationId: number;
      elapsedMs: number;
      cacheOutcome: WizardDashboardResult["cacheOutcome"];
    }
  | {
      event: "failed";
      operationId: number;
      elapsedMs: number;
      failedStage: FailureStage;
    }
  | { event: "dashboard-failed" };

interface DiagnosticLogger {
  info: (message: string, context: Record<string, unknown>) => void;
  warn: (message: string, context: Record<string, unknown>) => void;
}

/** Emit only allowlisted operational metadata, never request payloads or tokens. */
export function logWizardDashboardDiagnostic(
  diagnostic: WizardDashboardDiagnostic,
  logger: DiagnosticLogger = console
): void {
  if (diagnostic.event === "complete") {
    logger.info("[Wizards dashboard]", {
      event: diagnostic.event,
      operationId: diagnostic.operationId,
      elapsedMs: Math.max(0, Math.round(diagnostic.elapsedMs)),
      cacheOutcome: diagnostic.cacheOutcome,
    });
    return;
  }

  if (diagnostic.event === "failed") {
    logger.warn("[Wizards dashboard]", {
      event: diagnostic.event,
      operationId: diagnostic.operationId,
      elapsedMs: Math.max(0, Math.round(diagnostic.elapsedMs)),
      failedStage: diagnostic.failedStage,
    });
    return;
  }

  logger.warn("[Wizards dashboard]", { event: "dashboard-failed" });
}
