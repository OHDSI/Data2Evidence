export const sortByLabel = <T extends { label: string }>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base', numeric: true }))
