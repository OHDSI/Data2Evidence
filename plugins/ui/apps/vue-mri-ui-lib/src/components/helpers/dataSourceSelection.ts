import { sortByLabel } from './sortByLabel'

export interface DataSource {
  sourceKey: string
  sourceName?: string
}

export interface DataSourceItem {
  label: string
  value: string
}

export type BuilderSwitchStep = 'ignore' | 'guard' | 'confirm'

export function fallbackDatasetId(
  activeDatasetId: string,
  accessibleDatasetIds: readonly string[]
): string | undefined {
  if (accessibleDatasetIds.length === 0 || accessibleDatasetIds.includes(activeDatasetId)) return undefined
  return accessibleDatasetIds[0]
}

export function toDataSourceItems(sources: readonly DataSource[]): DataSourceItem[] {
  return sortByLabel(sources.map(source => ({ label: source.sourceName || source.sourceKey, value: source.sourceKey })))
}

export function builderSwitchStep(
  activeDatasetId: string,
  nextDatasetId: string,
  hasUnsavedChanges: boolean
): BuilderSwitchStep {
  if (!nextDatasetId || nextDatasetId === activeDatasetId) return 'ignore'
  return hasUnsavedChanges ? 'guard' : 'confirm'
}
