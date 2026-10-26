import { describe, expect, it } from 'vitest'
import { D2eExplorationCardStatus } from '@d2e/ui'
import { cardStatus } from '../explorationCardStatus'

const cohortDefinition = { id: 7 }

describe('cardStatus', () => {
  it('is not run when the card has no cohort definition', () => {
    expect(cardStatus({ bookmark: null, cohortDefinition: null })).toBe(D2eExplorationCardStatus.NOT_RUN)
    expect(cardStatus({})).toBe(D2eExplorationCardStatus.NOT_RUN)
  })

  it('is not run when the bookmark is stale but the card has no cohort definition', () => {
    // The UI links a cohort to a bookmark by id and name. When they differ, the card has no cohort.
    const bookmark = { materializationStatus: D2eExplorationCardStatus.STALE }
    expect(cardStatus({ bookmark, cohortDefinition: null })).toBe(D2eExplorationCardStatus.NOT_RUN)
  })

  it('is ready when the bookmark is ready', () => {
    const bookmark = { materializationStatus: D2eExplorationCardStatus.READY }
    expect(cardStatus({ bookmark, cohortDefinition })).toBe(D2eExplorationCardStatus.READY)
  })

  it('is stale when the bookmark is stale', () => {
    const bookmark = { materializationStatus: D2eExplorationCardStatus.STALE }
    expect(cardStatus({ bookmark, cohortDefinition })).toBe(D2eExplorationCardStatus.STALE)
  })

  it('is ready when the bookmark has no status', () => {
    // An older backend does not send the field.
    expect(cardStatus({ bookmark: {}, cohortDefinition })).toBe(D2eExplorationCardStatus.READY)
  })

  it('is ready when the bookmark says not run but the card has a cohort definition', () => {
    const bookmark = { materializationStatus: D2eExplorationCardStatus.NOT_RUN }
    expect(cardStatus({ bookmark, cohortDefinition })).toBe(D2eExplorationCardStatus.READY)
  })

  it('is ready when the status value is unknown', () => {
    expect(cardStatus({ bookmark: { materializationStatus: 'archived' }, cohortDefinition })).toBe(
      D2eExplorationCardStatus.READY
    )
  })

  it('is ready for a materialized cohort without a bookmark', () => {
    expect(cardStatus({ bookmark: null, cohortDefinition })).toBe(D2eExplorationCardStatus.READY)
  })
})
