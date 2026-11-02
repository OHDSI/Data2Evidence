import { describe, expect, it } from 'vitest'
import { sortByColumn } from '../explorationTableSort'

const record = (overrides: Record<string, unknown> = {}) => ({
  displayName: 'Exploration',
  bookmark: null,
  cohortDefinition: null,
  atlasCohortDefinition: null,
  ...overrides,
})

const names = (cards: { displayName: string }[]) => cards.map(card => card.displayName)

describe('sortByColumn', () => {
  it('keeps the incoming order when there is no column sort', () => {
    const cards = [record({ displayName: 'b' }), record({ displayName: 'a' })]
    const sorted = sortByColumn(cards, [])
    expect(names(sorted)).toEqual(['b', 'a'])
    expect(sorted).not.toBe(cards)
  })

  it('keeps the incoming order for a column it does not know', () => {
    const cards = [record({ displayName: 'b' }), record({ displayName: 'a' })]
    expect(names(sortByColumn(cards, [{ key: 'description', order: 'asc' }]))).toEqual(['b', 'a'])
  })

  it('sorts by name without regard to case, in both directions', () => {
    const cards = [record({ displayName: 'beta' }), record({ displayName: 'Alpha' }), record({ displayName: 'gamma' })]
    expect(names(sortByColumn(cards, [{ key: 'name', order: 'asc' }]))).toEqual(['Alpha', 'beta', 'gamma'])
    expect(names(sortByColumn(cards, [{ key: 'name', order: 'desc' }]))).toEqual(['gamma', 'beta', 'Alpha'])
  })

  it('sorts person count as a number', () => {
    const cards = [
      record({ displayName: 'ten', cohortDefinition: { patientCount: 10 } }),
      record({ displayName: 'nine', cohortDefinition: { patientCount: 9 } }),
      record({ displayName: 'large', cohortDefinition: { patientCount: 2123234 } }),
    ]
    expect(names(sortByColumn(cards, [{ key: 'personCount', order: 'asc' }]))).toEqual(['nine', 'ten', 'large'])
  })

  it('puts records with no value last in both directions', () => {
    const cards = [
      record({ displayName: 'none' }),
      record({ displayName: 'five', cohortDefinition: { patientCount: 5 } }),
      record({ displayName: 'one', cohortDefinition: { patientCount: 1 } }),
    ]
    expect(names(sortByColumn(cards, [{ key: 'personCount', order: 'asc' }]))).toEqual(['one', 'five', 'none'])
    expect(names(sortByColumn(cards, [{ key: 'personCount', order: 'desc' }]))).toEqual(['five', 'one', 'none'])
  })

  it('sorts materialization status with Ready first when ascending', () => {
    const cards = [record({ displayName: 'not-run' }), record({ displayName: 'ready', cohortDefinition: { id: 1 } })]
    expect(names(sortByColumn(cards, [{ key: 'status', order: 'asc' }]))).toEqual(['ready', 'not-run'])
    expect(names(sortByColumn(cards, [{ key: 'status', order: 'desc' }]))).toEqual(['not-run', 'ready'])
  })

  it('sorts a stale record between ready and not run, in both directions', () => {
    const cards = [
      record({ displayName: 'not-run' }),
      record({
        displayName: 'stale',
        cohortDefinition: { id: 2 },
        bookmark: { materializationStatus: 'stale' },
      }),
      record({ displayName: 'ready', cohortDefinition: { id: 1 } }),
    ]
    expect(names(sortByColumn(cards, [{ key: 'status', order: 'asc' }]))).toEqual(['ready', 'stale', 'not-run'])
    expect(names(sortByColumn(cards, [{ key: 'status', order: 'desc' }]))).toEqual(['not-run', 'stale', 'ready'])
  })

  it('sorts last materialized on by date', () => {
    const cards = [
      record({ displayName: 'may', cohortDefinition: { createdOn: '2026-05-14T10:00:00.000Z' } }),
      record({ displayName: 'jan', cohortDefinition: { createdOn: '2026-01-02T10:00:00.000Z' } }),
    ]
    expect(names(sortByColumn(cards, [{ key: 'lastMaterialized', order: 'asc' }]))).toEqual(['jan', 'may'])
  })

  it('sorts cohort id numerically', () => {
    const cards = [
      record({ displayName: 'forty', cohortDefinition: { id: 40 } }),
      record({ displayName: 'nine', cohortDefinition: { id: '9' } }),
      record({ displayName: 'twelve', cohortDefinition: { id: 12 } }),
    ]
    expect(names(sortByColumn(cards, [{ key: 'cohortId', order: 'asc' }]))).toEqual(['nine', 'twelve', 'forty'])
  })

  it('sorts bookmark created by, falling back to the Atlas author', () => {
    const cards = [
      record({ displayName: 'zed', bookmark: { username: 'zed' } }),
      record({ displayName: 'amy', atlasCohortDefinition: { username: 'amy' } }),
    ]
    expect(names(sortByColumn(cards, [{ key: 'createdBy', order: 'asc' }]))).toEqual(['amy', 'zed'])
  })

  it('sorts bookmark last updated, falling back to the Atlas update time', () => {
    const cards = [
      record({ displayName: 'bookmark', bookmark: { dateModified: '2026-03-01T00:00:00.000Z' } }),
      record({ displayName: 'atlas', atlasCohortDefinition: { updatedOn: '2026-02-01T00:00:00.000Z' } }),
    ]
    expect(names(sortByColumn(cards, [{ key: 'lastUpdated', order: 'asc' }]))).toEqual(['atlas', 'bookmark'])
  })

  it('keeps the incoming order for equal values', () => {
    const cards = [
      record({ displayName: 'first', cohortDefinition: { patientCount: 3 } }),
      record({ displayName: 'second', cohortDefinition: { patientCount: 3 } }),
    ]
    expect(names(sortByColumn(cards, [{ key: 'personCount', order: 'desc' }]))).toEqual(['first', 'second'])
  })

  it('does not mutate its input', () => {
    const cards = [record({ displayName: 'b' }), record({ displayName: 'a' })]
    sortByColumn(cards, [{ key: 'name', order: 'asc' }])
    expect(names(cards)).toEqual(['b', 'a'])
  })
})
