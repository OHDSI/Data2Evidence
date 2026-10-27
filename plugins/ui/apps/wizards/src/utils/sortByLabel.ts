export function sortByLabel<T extends { label: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base", numeric: true }));
}
