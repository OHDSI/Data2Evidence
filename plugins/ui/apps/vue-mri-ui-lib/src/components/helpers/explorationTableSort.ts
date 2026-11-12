import { D2eExplorationCardStatus } from '@d2e/ui'
import { cardStatus } from './explorationCardStatus'

export interface ExplorationColumnSort {
  key: string
  order: 'asc' | 'desc'
}

type SortValue = string | number | null

const STATUS_RANK: Record<D2eExplorationCardStatus, number> = {
  [D2eExplorationCardStatus.READY]: 0,
  [D2eExplorationCardStatus.STALE]: 1,
  [D2eExplorationCardStatus.NOT_RUN]: 2,
}

const toMs = (value: unknown): number | null => {
  if (!value) return null
  const ms = new Date(value as string).getTime()
  return Number.isNaN(ms) ? null : ms
}

const toText = (value: unknown): string | null => (typeof value === 'string' && value.length > 0 ? value : null)

const toIdValue = (value: unknown): SortValue => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string' || value.length === 0) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : value
}

const COLUMN_VALUES: Record<string, (card) => SortValue> = {
  name: card => toText(card?.displayName),
  status: card => STATUS_RANK[cardStatus(card ?? {})],
  personCount: card =>
    typeof card?.cohortDefinition?.patientCount === 'number' ? card.cohortDefinition.patientCount : null,
  lastMaterialized: card => toMs(card?.cohortDefinition?.createdOn),
  cohortId: card => toIdValue(card?.cohortDefinition?.id),
  createdBy: card => toText(card?.bookmark?.username) ?? toText(card?.atlasCohortDefinition?.username),
  lastUpdated: card => toMs(card?.bookmark?.dateModified) ?? toMs(card?.atlasCohortDefinition?.updatedOn),
}

const compareValues = (a: SortValue, b: SortValue): number => {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

export function sortByColumn<T>(cards: readonly T[], sort: readonly ExplorationColumnSort[]): T[] {
  const active = sort[0]
  const valueOf = active ? COLUMN_VALUES[active.key] : undefined
  if (!active || !valueOf) return [...cards]

  const direction = active.order === 'desc' ? -1 : 1
  return cards
    .map(card => ({ card, value: valueOf(card) }))
    .sort((a, b) => {
      if (a.value === null || b.value === null) {
        return Number(a.value === null) - Number(b.value === null)
      }
      return direction * compareValues(a.value, b.value)
    })
    .map(entry => entry.card)
}
