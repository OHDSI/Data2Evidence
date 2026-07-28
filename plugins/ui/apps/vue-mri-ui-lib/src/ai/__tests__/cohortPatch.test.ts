import { vi } from 'vitest'
import { applyCohortPatch, type PatchOp } from '../cohortPatch'

// A store stand-in that models just enough of the query module for the applier:
// filter cards, constraints, and the actions/getters it calls. Cards and
// constraints are held in plain maps so tests can assert the resulting state.
const makeStore = ({ existingCards = [] as string[], axes = [] as any[] } = {}) => {
  const cards: Record<string, { props: { excludeFilter: boolean } }> = {}
  for (const id of existingCards) cards[id] = { props: { excludeFilter: false } }
  const constraints: Record<string, any> = {}
  // Instance numbers continue past whatever is already on the cohort, as they do live.
  let cardSeq = existingCards.filter(id => id !== 'patient').length
  let conSeq = 0

  const store: any = {
    getters: {
      getFilterCards: () => cards,
      getAllAxes: axes,
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
      case 'setAxisValue': {
        if (axes[payload.id]) axes[payload.id].props = { ...axes[payload.id].props, ...payload.props }
        return Promise.resolve(undefined)
      }
      case 'addFilterCard': {
        // Mirror BoolFilterContainer.createFilterCard: the Basic Data card keeps its
        // config path as its instance id, interaction cards get an index suffix.
        const id = payload.configPath === 'patient' ? 'patient' : `${payload.configPath}.${++cardSeq}`
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
        // Mirror the real query-module action: deleting a card clears every axis
        // bound to that card id.
        for (const axis of axes) {
          if (axis?.props?.filterCardId === payload.filterCardId) {
            axis.props = { ...axis.props, attributeId: '', filterCardId: '', key: '' }
          }
        }
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

  it('accepts a NUMERIC conceptSetId (d2e-mcp create_concept_set) — no "[object Object]"', async () => {
    const { store, constraints } = makeStore()
    await applyCohortPatch(store, [
      { op: 'add_card', cardConfigPath: 'patient.interactions.conditionoccurrence', ref: 'dx' },
      {
        op: 'add_constraint',
        card: 'dx',
        attributePath: 'patient.interactions.conditionoccurrence.attributes.condition',
        // conceptSetId as a number, exactly as create_concept_set returns it
        value: { conceptSetId: 29, includeDescendants: true, displayValue: 'Sinusitis' },
      },
    ])

    const con = Object.values(constraints).find((c: any) => c.props.attrKey === 'condition') as any
    // value must be the stringified concept-set id (the filter Expression reads .value),
    // NOT the object stringified to "[object Object]".
    expect(con.props.value).toEqual([
      { value: '29', text: 'Sinusitis', display_value: 'Sinusitis', includeDescendants: true },
    ])
  })

  it('reports the constraint values that actually landed, read back from the store', async () => {
    const { store } = makeStore()
    const res = await applyCohortPatch(store, [
      { op: 'add_card', cardConfigPath: 'patient.interactions.conditionoccurrence', ref: 'dx' },
      {
        op: 'add_constraint',
        card: 'dx',
        attributePath: 'patient.interactions.conditionoccurrence.attributes.condition',
        value: { conceptSetId: 37, displayValue: "Alzheimer's disease" },
      },
    ])

    expect(res.appliedConstraints).toEqual([
      {
        card: 'patient.interactions.conditionoccurrence.1',
        attributePath: 'patient.interactions.conditionoccurrence.attributes.condition',
        value: [
          {
            value: '37',
            text: "Alzheimer's disease",
            display_value: "Alzheimer's disease",
            includeDescendants: false,
          },
        ],
      },
    ])
  })

  it('rejects an add_constraint with no value instead of silently clearing the filter', async () => {
    const { store, cards } = makeStore()
    await expect(
      applyCohortPatch(store, [
        { op: 'add_card', cardConfigPath: 'patient.interactions.conditionoccurrence', ref: 'dx' },
        {
          op: 'add_constraint',
          card: 'dx',
          attributePath: 'patient.interactions.conditionoccurrence.attributes.conditionconceptset',
        } as any,
      ])
    ).rejects.toThrow(/has no value/)

    // The half-built card must not survive as an unfiltered Condition Occurrence.
    expect(Object.keys(cards)).toHaveLength(0)
  })

  it('names the mistake when the concept-set id sits beside `value` instead of inside it', async () => {
    const { store } = makeStore()
    await expect(
      applyCohortPatch(store, [
        { op: 'add_card', cardConfigPath: 'patient.interactions.conditionoccurrence', ref: 'dx' },
        {
          op: 'add_constraint',
          card: 'dx',
          attributePath: 'patient.interactions.conditionoccurrence.attributes.conditionconceptset',
          conceptSetId: 37,
        } as any,
      ])
    ).rejects.toThrow(/conceptSetId at the top level of the op — it belongs inside `value`/)
  })

  it('rejects an empty-string / empty-array value on a text attribute', async () => {
    for (const value of ['', [], {}, null]) {
      const { store } = makeStore()
      await expect(
        applyCohortPatch(store, [
          { op: 'add_card', cardConfigPath: 'patient.interactions.priDiag', ref: 'dx' },
          {
            op: 'add_constraint',
            card: 'dx',
            attributePath: 'patient.interactions.priDiag.attributes.icd',
            value,
          } as any,
        ])
      ).rejects.toThrow(/has no value/)
    }
  })

  it('rejects an unknown cardConfigPath with a recoverable message when config is loaded', async () => {
    const { store } = makeStore()
    store.getters.getMriFrontendConfig = {
      getFilterCards: () => [{ getConfigPath: () => 'patient' }],
    }
    await expect(
      applyCohortPatch(store, [{ op: 'add_card', cardConfigPath: 'patient.bogus' }])
    ).rejects.toThrow(/Unknown cardConfigPath/)
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

  it('reuses the Basic Data card instead of adding a second copy of it', async () => {
    // The model has no way to know Basic Data is always present, so it adds it
    // before constraining Age/Gender. The store would create a SECOND card under
    // the same instance id ('patient'), which duplicates every constraint on it in
    // the generated SQL and clears the chart axes as soon as either copy is deleted.
    const { store, cards } = makeStore({ existingCards: ['patient'] })
    const res = await applyCohortPatch(store, [
      { op: 'add_card', cardConfigPath: 'patient', ref: 'basic' },
      { op: 'add_constraint', card: 'basic', attributePath: 'patient.attributes.age', value: '<100' },
    ])

    expect(store.dispatch).not.toHaveBeenCalledWith('addFilterCard', expect.objectContaining({ configPath: 'patient' }))
    expect(Object.keys(cards)).toEqual(['patient'])
    // The ref still resolves, so the constraint lands on the card that is there.
    expect(res.applied).toBe(true)
    expect(res.createdCards).toEqual([])
  })

  it('still creates a second instance of an indexed (interaction) card', async () => {
    const { store, cards } = makeStore({ existingCards: ['patient.interactions.conditionoccurrence.1'] })
    await applyCohortPatch(store, [
      { op: 'add_card', cardConfigPath: 'patient.interactions.conditionoccurrence' },
    ])
    expect(Object.keys(cards)).toHaveLength(2)
  })

  it('restores the axis selection when a rolled-back card deletion clears it', async () => {
    const axes = [
      { props: { attributeId: 'patient.attributes.Gender', filterCardId: 'patient', key: 'Gender' } },
      { props: { attributeId: 'patient.attributes.Age', filterCardId: 'patient', key: 'Age', binsize: 10 } },
    ]
    const { store } = makeStore({ axes })

    await expect(
      applyCohortPatch(store, [
        // 'patient' is absent here, so this genuinely creates the card...
        { op: 'add_card', cardConfigPath: 'patient', ref: 'p' },
        // ...and this fails, so the rollback deletes it again — taking both axes with it.
        { op: 'add_constraint', card: 'ghost', attributePath: 'patient.attributes.age', value: 1 },
      ])
    ).rejects.toThrow(/Unknown card/)

    expect(axes[0].props).toMatchObject({
      attributeId: 'patient.attributes.Gender',
      filterCardId: 'patient',
      key: 'Gender',
    })
    expect(axes[1].props).toMatchObject({ attributeId: 'patient.attributes.Age', filterCardId: 'patient', binsize: 10 })
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
