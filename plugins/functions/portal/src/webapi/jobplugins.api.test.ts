import { describe, it } from '@std/testing/bdd'
import { assertEquals } from '@std/assert'
import { normalizeFlowState } from './jobplugins.api.ts'

describe('normalizeFlowState', () => {
  it('treats an upper-case state.type as terminal success', () => {
    assertEquals(normalizeFlowState({ state: { type: 'COMPLETED' } }), 'COMPLETED')
  })

  it('treats a title-case state.name as terminal success', () => {
    assertEquals(normalizeFlowState({ state: { name: 'Completed' } }), 'COMPLETED')
  })

  it('maps every terminal failure state onto FAILED', () => {
    for (const s of ['FAILED', 'CRASHED', 'CANCELLED', 'TIMEDOUT']) {
      assertEquals(normalizeFlowState({ state: { type: s } }), 'FAILED')
    }
  })

  it('maps in-flight states onto RUNNING', () => {
    for (const s of ['PENDING', 'SCHEDULED', 'RUNNING', 'RETRYING', 'PAUSED', 'LATE']) {
      assertEquals(normalizeFlowState({ state: { type: s } }), 'RUNNING')
    }
  })

  it('returns UNKNOWN for a missing or unrecognised state', () => {
    assertEquals(normalizeFlowState(undefined), 'UNKNOWN')
    assertEquals(normalizeFlowState({}), 'UNKNOWN')
    assertEquals(normalizeFlowState({ state: { type: 'WAT' } }), 'UNKNOWN')
  })
})
