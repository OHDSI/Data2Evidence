import { D2eExplorationCardStatus } from '@d2e/ui'

/** The parts of a `BookmarkDisplay` that give the card status. */
export interface CardStatusSource {
  bookmark?: { materializationStatus?: string } | null
  cohortDefinition?: unknown
}

/**
 * The status that the exploration card shows.
 *
 * A card without a cohort definition is not run, whatever the bookmark says.
 * A card with a cohort definition is stale only when the bookmark says so. An
 * older backend does not send the status, so the card is then ready.
 */
export function cardStatus(card: CardStatusSource): D2eExplorationCardStatus {
  if (!card.cohortDefinition) {
    return D2eExplorationCardStatus.NOT_RUN
  }
  return card.bookmark?.materializationStatus === D2eExplorationCardStatus.STALE
    ? D2eExplorationCardStatus.STALE
    : D2eExplorationCardStatus.READY
}
