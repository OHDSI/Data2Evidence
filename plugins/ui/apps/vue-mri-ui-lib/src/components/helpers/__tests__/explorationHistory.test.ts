import { describe, expect, it } from 'vitest'
import { BUILDER_ENTRY_KEY, isBuilderEntry, leaveBuilderEntry, pushBuilderEntry } from '../explorationHistory'

const fakeHistory = (state: unknown) => {
  const calls: string[] = []
  const history = {
    state,
    pushState(next: unknown, _title: string, url?: string) {
      calls.push(`push:${url ?? ''}`)
      history.state = next
    },
    back() {
      calls.push('back')
    },
  }
  return { history, calls }
}

describe('explorationHistory', () => {
  it('pushes a builder entry that keeps the host router state', () => {
    const { history, calls } = fakeHistory({ current: '/plugins/patient-analytics/', position: 3 })

    pushBuilderEntry(history)

    expect(calls).toEqual(['push:'])
    expect(history.state).toEqual({ current: '/plugins/patient-analytics/', position: 3, [BUILDER_ENTRY_KEY]: true })
  })

  it('pushes onto a null history state', () => {
    const { history } = fakeHistory(null)

    pushBuilderEntry(history)

    expect(isBuilderEntry(history.state)).toBe(true)
  })

  it('does not push a second entry while the builder entry is current', () => {
    const { history, calls } = fakeHistory({ [BUILDER_ENTRY_KEY]: true })

    pushBuilderEntry(history)

    expect(calls).toEqual([])
  })

  it('recognises only the builder entry', () => {
    expect(isBuilderEntry({ [BUILDER_ENTRY_KEY]: true })).toBe(true)
    expect(isBuilderEntry({ position: 3 })).toBe(false)
    expect(isBuilderEntry(null)).toBe(false)
    expect(isBuilderEntry('builder')).toBe(false)
  })

  it('goes back when it leaves the builder entry', () => {
    const { history, calls } = fakeHistory({ [BUILDER_ENTRY_KEY]: true })

    expect(leaveBuilderEntry(history)).toBe(true)
    expect(calls).toEqual(['back'])
  })

  it('does nothing when the builder entry is not current', () => {
    const { history, calls } = fakeHistory({ position: 3 })

    expect(leaveBuilderEntry(history)).toBe(false)
    expect(calls).toEqual([])
  })
})
