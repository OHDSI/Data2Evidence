export interface ShinyDashboardContext {
  datasetId: string;
  cohortId: string;
  wizardConfig: Record<string, unknown> | null;
  mriquery: string | null;
}

export interface ShinyDashboardAuthMessage {
  type: "AUTH_TOKEN";
  token: string;
  timestamp: number;
  context: ShinyDashboardContext;
}

export function resolveShinyDashboardMessageSource(
  source: MessageEventSource | null,
  iframeWindow: Window | null | undefined
): Window | null {
  if (!source || !iframeWindow) return null;
  if (source === iframeWindow) return iframeWindow;

  try {
    const sourceWindow = source as Window;
    return sourceWindow.parent === iframeWindow ? sourceWindow : null;
  } catch {
    return null;
  }
}

export function buildShinyDashboardIframeUrl(datasetId: string, wizardConfig?: Record<string, unknown> | null): string {
  const dashboardType = String(wizardConfig?.dashboardType ?? "").trim();
  if (!datasetId || !dashboardType) return "";
  return `/gateway/api/dataset/shiny-live/${datasetId}_cohort_${dashboardType}_python/`;
}

export function serializeWizardConfig(wizardConfig?: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!wizardConfig) return null;
  try {
    return JSON.parse(JSON.stringify(wizardConfig));
  } catch {
    return null;
  }
}

export function buildShinyDashboardAuthMessage({
  token,
  datasetId,
  cohortId,
  wizardConfig,
  mriquery,
  timestamp = Date.now(),
}: {
  token: string;
  datasetId: string;
  cohortId: string;
  wizardConfig?: Record<string, unknown> | null;
  mriquery?: string | null;
  timestamp?: number;
}): ShinyDashboardAuthMessage {
  return {
    type: "AUTH_TOKEN",
    token,
    timestamp,
    context: {
      datasetId,
      cohortId,
      wizardConfig: serializeWizardConfig(wizardConfig),
      mriquery: mriquery || null,
    },
  };
}
