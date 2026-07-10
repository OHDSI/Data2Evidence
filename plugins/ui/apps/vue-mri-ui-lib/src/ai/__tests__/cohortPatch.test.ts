import { vi } from 'vitest'
import { applyCohortPatch, type PatchOp } from '../cohortPatch'

// A store stand-in that models just enough of the query module for the applier:
// filter cards, constraints, and the actions/getters it calls. Cards and
// constraints are held in plain maps so tests can assert the resulting state.
const makeStore = () => {
  const cards: Record<string, { props: { excludeFilter: boolean } }> = {}
  const constraints: Record<string, any> = {}
  let cardSeq = 0
  let conSeq = 0

  const store: any = {
    getters: {
      getFilterCards: () => cards,
      getConstraintForAttribute: ({ filterCardId, key }: { filterCardId: string; key: string }) =>
        Object.values(constraints).find((c: any) => c.parent === filterCardId && c.props.attrKey === key) ?? null,
    },
    dispatch: vi.fn(),
  }

  store.dispatch.mockImplementation((type: string, payload: any) => {
    switch (type) {
      case 'holdFireRequest':
      case 'releaseFireRequest':
      case 'setFireRequest':
      case 'refreshPatientCount':
      case 'resetAxes':
        return Promise.resolve(undefined)
      case 'addFilterCard': {
        const id = `fc${++cardSeq}`
        cards[id] = { props: { excludeFilter: payload.isExclusion ?? false } }
        return Promise.resolve(id)
      }
      case 'addFilterCardConstraint': {
        const id = `con${++conSeq}`
        // type derived from key for test purposes: age -> num, else conceptSet/text
        const type = payload.key === 'age' ? 'num' : payload.key === 'condition' ? 'conceptSet' : 'text'
        constraints[id] = { id, parent: payload.filterCardId, props: { attrKey: payload.key, type, value: undefined } }
        return Promise.resolve(id)
      }
      case 'updateConstraintValue': {
        constraints[payload.constraintId].props.value = payload.value
        return Promise.resolve(undefined)
      }
      case 'deleteFilterCardConstraint': {
        delete constraints[payload.constraintId]
        return Promise.resolve(undefined)
      }
      case 'deleteFilterCard': {
        delete cards[payload.filterCardId]
        return Promise.resolve(undefined)
      }
      default:
        return Promise.resolve(undefined)
    }
  })

  return { store, cards, constraints }
}

describe('applyCohortPatch', () => {
  it('rejects an empty patch', async () => {
    const { store } = makeStore()
    await expect(applyCohortPatch(store, [] as PatchOp[])).rejects.toThrow(/non-empty/)
  })

  it('holds fire-request, then releases + refreshes after success', async () => {
    const { store } = makeStore()
    await applyCohortPatch(store, [{ op: 'add_card', cardConfigPath: 'patient.interactions.priDiag' }])

    expect(store.dispatch).toHaveBeenCalledWith('holdFireRequest', undefined)
    expect(store.dispatch).toHaveBeenCalledWith('releaseFireRequest', undefined)
    expect(store.dispatch).toHaveBeenCalledWith('setFireRequest', undefined)
    expect(store.dispatch).toHaveBeenCalledWith('refreshPatientCount', undefined)
  })

  it('applies a basic numeric filter (age >= 65) via the shared normalizer', async () => {
    const { store, constraints } = makeStore()
    const res = await applyCohortPatch(store, [
      { op: 'add_card', cardConfigPath: 'patient', ref: 'basic' },
      { op: 'add_constraint', card: 'basic', attributePath: 'patient.attributes.age', value: '>=65' },
    ])

    expect(res.applied).toBe(true)
    const con = Object.values(constraints).find((c: any) => c.props.attrKey === 'age') as any
    expect(con.props.value).toEqual([{ op: '>=', value: 65 }])
  })

  it('applies a concept-set filter with the picker value shape (conceptSetId + includeDescendants)', async () => {
    const { store, constraints } = makeStore()
    await applyCohortPatch(store, [
      { op: 'add_card', cardConfigPath: 'patient.interactions.priDiag', ref: 'dx' },
      {
        op: 'add_constraint',
        card: 'dx',
        attributePath: 'patient.interactions.priDiag.attributes.condition',
        value: { conceptSetId: 'cs_42', includeDescendants: true, displayValue: 'Viral sinusitis' },
      },
    ])

    const con = Object.values(constraints).find((c: any) => c.props.attrKey === 'condition') as any
    expect(con.props.value).toEqual([
      { value: 'cs_42', text: 'Viral sinusitis', display_value: 'Viral sinusitis', includeDescendants: true },
    ])
  })

  it('creates an exclusion card when exclude is set', async () => {
    const { store, cards } = makeStore()
    await applyCohortPatch(store, [{ op: 'add_card', cardConfigPath: 'patient.interactions.priDiag', exclude: true }])
    expect(store.dispatch).toHaveBeenCalledWith('addFilterCard', {
      configPath: 'patient.interactions.priDiag',
      isExclusion: true,
    })
    expect(Object.values(cards)[0].props.excludeFilter).toBe(true)
  })

  it('resolves a ref across a multi-op patch and reports created cards', async () => {
    const { store } = makeStore()
    const res = await applyCohortPatch(store, [
      { op: 'add_card', cardConfigPath: 'patient', ref: 'p' },
      { op: 'add_constraint', card: 'p', attributePath: 'patient.attributes.age', value: 65 },
    ])
    expect(res.createdCards).toHaveLength(1)
  })

  it('rolls back created cards/constraints when a later op fails (atomic)', async () => {
    const { store, cards, constraints } = makeStore()
    await expect(
      applyCohortPatch(store, [
        { op: 'add_card', cardConfigPath: 'patient', ref: 'p' },
        { op: 'add_constraint', card: 'p', attributePath: 'patient.attributes.age', value: 65 },
        // Unknown card ref -> resolveCard throws mid-patch.
        { op: 'add_constraint', card: 'ghost', attributePath: 'patient.attributes.age', value: 1 },
      ])
    ).rejects.toThrow(/Unknown card/)

    // Everything created during the patch is undone.
    expect(Object.keys(cards)).toHaveLength(0)
    expect(Object.keys(constraints)).toHaveLength(0)
    expect(store.dispatch).toHaveBeenCalledWith('releaseFireRequest', undefined)
    // No live refresh on failure.
    expect(store.dispatch).not.toHaveBeenCalledWith('refreshPatientCount', undefined)
  })
})
