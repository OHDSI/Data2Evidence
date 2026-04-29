// Patient list backend ignores entry/exit semantics, so we drop these fields
// from FilterCard nodes before sending. See issue #2234.
export function stripEntryExitFromCards(cards: any): any {
  if (cards === null || typeof cards !== 'object') {
    return cards
  }

  if (Array.isArray(cards)) {
    return cards.map(stripEntryExitFromCards)
  }

  if (cards.type === 'FilterCard') {
    const { isEntry, isExit, ...rest } = cards
    return {
      ...rest,
      attributes: stripEntryExitFromCards(rest.attributes),
    }
  }

  if (cards.type === 'BooleanContainer') {
    return {
      ...cards,
      content: Array.isArray(cards.content) ? cards.content.map(stripEntryExitFromCards) : cards.content,
    }
  }

  return cards
}
