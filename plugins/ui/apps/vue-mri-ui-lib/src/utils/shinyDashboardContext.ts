export interface ShinyDashboardContext {
  datasetId: string
  cohortId: string
  wizardConfig: Record<string, unknown> | null
  mriquery: string | null
}

export interface ShinyDashboardAuthMessage {
  type: 'AUTH_TOKEN'
  token: string
  timestamp: number
  parentOrigin: string
  context: ShinyDashboardContext
}

export function buildShinyDashboardIframeUrl(datasetId: string, wizardConfig?: Record<string, unknown> | null): string {
  const dashboardType = String(wizardConfig?.dashboardType ?? '').trim()
  if (!dashboardType) {
    return ''
  }

  return `/gateway/api/dataset/shiny-live/${datasetId}_cohort_${dashboardType}_python/`
}

export function serializeWizardConfig(wizardConfig?: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!wizardConfig) {
    return null
  }

  try {
    return JSON.parse(JSON.stringify(wizardConfig))
  } catch {
    return null
  }
}

export function buildShinyDashboardAuthMessage({
  token,
  parentOrigin,
  datasetId,
  cohortId,
  wizardConfig,
  mriquery,
  timestamp = Date.now(),
}: {
  token: string
  parentOrigin: string
  datasetId: string
  cohortId: string
  wizardConfig?: Record<string, unknown> | null
  mriquery?: string | null
  timestamp?: number
}): ShinyDashboardAuthMessage {
  return {
    type: 'AUTH_TOKEN',
    token,
    timestamp,
    parentOrigin,
    context: {
      datasetId,
      cohortId,
      wizardConfig: serializeWizardConfig(wizardConfig),
      mriquery: mriquery || null,
    },
  }
}
