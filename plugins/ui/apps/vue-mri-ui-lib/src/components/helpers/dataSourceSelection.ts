export function fallbackDatasetId(
  activeDatasetId: string,
  accessibleDatasetIds: readonly string[]
): string | undefined {
  if (accessibleDatasetIds.length === 0 || accessibleDatasetIds.includes(activeDatasetId)) return undefined
  return accessibleDatasetIds[0]
}
