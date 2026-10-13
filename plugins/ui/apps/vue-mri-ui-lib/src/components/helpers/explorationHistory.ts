export const BUILDER_ENTRY_KEY = 'd2eExplorationBuilder'

type HistoryLike = Pick<History, 'state' | 'pushState' | 'back'>

export const isBuilderEntry = (state: unknown): boolean =>
  typeof state === 'object' && state !== null && (state as Record<string, unknown>)[BUILDER_ENTRY_KEY] === true

export const pushBuilderEntry = (history: HistoryLike): void => {
  if (isBuilderEntry(history.state)) return
  const current = typeof history.state === 'object' && history.state !== null ? history.state : {}
  history.pushState({ ...current, [BUILDER_ENTRY_KEY]: true }, '')
}

export const leaveBuilderEntry = (history: HistoryLike): boolean => {
  if (!isBuilderEntry(history.state)) return false
  history.back()
  return true
}
