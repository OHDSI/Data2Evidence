import { vi } from 'vitest'
import { applyCohortPatch, type PatchOp } from '../cohortPatch'

// A store stand-in that models just enough of the query module for the applier:
// filter cards, constraints, the bool-container tree that carries the AND/OR
// structure, and the actions/getters it calls. Cards and constraints are held in
// plain maps so tests can assert the resulting state.
//
// `existingCards` is a flat list (one card per group, i.e. all AND-ed) unless
// `existingGroups` is passed, which spells the grouping out: each inner array is
// one bool-filter container, so cards listed together are OR-ed.
const makeStore = ({
  existingCards = [] as string[],
  existingGroups,
  axes = [] as any[],
  // attributePath -> config `domainFilter`, the OMOP domain a conceptSet
  // attribute's concepts must come from. Only set in the tests that exercise it.
  domains,
}: {
  existingCards?: string[]
  existingGroups?: string[][]
  axes?: any[]
  domains?: Record<string, string>
} = {}) => {
  const cards: Record<string, { props: { excludeFilter: boolean; name?: string } }> = {}
  const groups: string[][] = existingGroups ?? existingCards.map(id => [id])
  for (const id of groups.flat()) cards[id] = { props: { excludeFilter: false } }
  const constraints: Record<string, any> = {}
  // Instance numbers continue past whatever is already on the cohort, as they do live.
  let cardSeq = Object.keys(cards).filter(id => id !== 'patient').length
  let conSeq = 0

  // Bool containers are addressed by id in the store, so index them the way the
  // real entity map does: group N is container "bfc<N>", stable across splices.
  const containerIds = () => groups.map((_, i) => `bfc${i}`)
  const groupOf = (containerId: string) => groups[Number(containerId.replace('bfc', ''))]

  const store: any = {
    getters: {
      getFilterCards: () => cards,
      getFilterCard: (id: string) => cards[id],
      getFilterCardConstraints: (cardId: string) => Object.values(constraints).filter((c: any) => c.parent === cardId),
      getAllAxes: axes,
      getBoolContainerRoot: () => 'root',
      getBoolContainer: (id: string) => (id === 'root' ? { props: { boolfiltercontainers: containerIds() } } : null),
      getBoolFilterContainer: (id: string) => ({ props: { filterCards: groupOf(id) ?? [] } }),
      getConstraintForAttribute: ({ filterCardId, key }: { filterCardId: string; key: string }) =>
        Object.values(constraints).find((c: any) => c.parent === filterCardId && c.props.attrKey === key) ?? null,
      ...(domains
        ? {
            getMriFrontendConfig: {
              getAttributeByPath: (path: string) => ({ getDomainFilter: () => domains[path] ?? '' }),
            },
          }
        : {}),
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
        // No container id → a NEW group (AND). With one → join that group (OR).
        const target = payload.boolFilterContainerId ? groupOf(payload.boolFilterContainerId) : undefined
        if (target) {
          target.push(id)
        } else {
          groups.push([id])
        }
        return Promise.resolve(id)
      }
      // AND → OR: fold this container into the nearest preceding one.
      case 'toggleFilterContainerBooleanCondition': {
        const index = Number(payload.filterContainerId.replace('bfc', ''))
        groups[index - 1].push(...groups[index])
        groups.splice(index, 1)
        return Promise.resolve(undefined)
      }
      // OR → AND: split the card (and everything after it) into its own container.
      case 'toggleFilterBooleanCondition': {
        const index = Number(payload.parentId.replace('bfc', ''))
        const group = groups[index]
        const moved = group.splice(group.indexOf(payload.filterCardId))
        groups.splice(index + 1, 0, moved)
        return Promise.resolve(undefined)
      }
      case 'addFilterCardConstraint': {
        const id = `con${++conSeq}`
        // type derived from key for test purposes: age -> num, else conceptSet/text
        const type =
          payload.key === 'age'
            ? 'num'
            : payload.key === 'condition' || /conceptset$/i.test(payload.key)
              ? 'conceptSet'
              : 'text'
        // The real constraint carries the attribute's config path; the card's
        // instance id is its config path plus an index suffix.
        const attributePath = `${payload.filterCardId.replace(/\.\d+$/, '')}.attributes.${payload.key}`
        constraints[id] = {
          id,
          parent: payload.filterCardId,
          props: { attrKey: payload.key, attributePath, type, value: undefined },
        }
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
        // Mirror FILTERCARD_DELETE: the card leaves its container, and a container
        // left empty is dropped from the tree.
        for (let i = groups.length - 1; i >= 0; i -= 1) {
          const at = groups[i].indexOf(payload.filterCardId)
          if (at > -1) groups[i].splice(at, 1)
          if (groups[i].length === 0) groups.splice(i, 1)
        }
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

  return { store, cards, constraints, groups }
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
    // The `ref` resolved across ops, so the constraint landed on the card the
    // preceding add_card created.
    expect(res.createdCards).toHaveLength(1)
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

  it('reports the constraint values that actually landed, read back from the store', async () => {
    const { store } = makeStore()
    const res = await applyCohortPatch(store, [
      { op: 'add_card', cardConfigPath: 'patient.interactions.conditionoccurrence', ref: 'dx' },
      {
        op: 'add_constraint',
        card: 'dx',
        attributePath: 'patient.interactions.conditionoccurrence.attributes.condition',
        // conceptSetId as a NUMBER, exactly as d2e-mcp create_concept_set returns it:
        // it has to land as the stringified id (the filter Expression reads .value),
        // never as the object stringified to "[object Object]" — a broken filter that
        // renders an empty chart and a patient count of "--".
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

  // Every empty shape is caught by the same input check, before anything is
  // mutated: applyConstraintValue reads an empty value on a text/conceptSet
  // attribute as "clear this filter", so the patch would report success and leave
  // a filter card with no constraint on the cohort.
  it.each([[undefined], [''], [[]], [{}], [null]])(
    'rejects an add_constraint whose value is %p instead of silently clearing the filter',
    async value => {
      const { store, cards } = makeStore()
      await expect(
        applyCohortPatch(store, [
          { op: 'add_card', cardConfigPath: 'patient.interactions.conditionoccurrence', ref: 'dx' },
          {
            op: 'add_constraint',
            card: 'dx',
            attributePath: 'patient.interactions.conditionoccurrence.attributes.conditionconceptset',
            value,
          } as any,
        ])
      ).rejects.toThrow(/has no value/)

      // The half-built card must not survive as an unfiltered Condition Occurrence.
      expect(Object.keys(cards)).toHaveLength(0)
    }
  )

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

  describe('AND / OR grouping', () => {
    const DX = 'patient.interactions.conditionoccurrence'

    it('AND-s a new card by default (each card in its own group)', async () => {
      const { store, groups } = makeStore({ existingCards: ['patient', `${DX}.1`] })
      const res = await applyCohortPatch(store, [{ op: 'add_card', cardConfigPath: DX }])

      expect(groups).toEqual([['patient'], [`${DX}.1`], [`${DX}.2`]])
      expect(res.cardGroups).toHaveLength(3)
    })

    it('ORs a new card with an existing one via orWith — "Alzheimer\'s OR sinusitis"', async () => {
      // The reported bug: asked to widen an Alzheimer's cohort to "Alzheimer's OR
      // sinusitis", the assistant could only add a second AND-ed card, which reads
      // as "had both". The second condition has to land in the FIRST card's group.
      const { store, groups, constraints } = makeStore({ existingCards: ['patient', `${DX}.1`] })
      const res = await applyCohortPatch(store, [
        { op: 'add_card', cardConfigPath: DX, ref: 'dx2', orWith: `${DX}.1` },
        {
          op: 'add_constraint',
          card: 'dx2',
          attributePath: `${DX}.attributes.conditionconceptset`,
          value: { conceptSetId: 42, displayValue: 'Sinusitis' },
        },
      ])

      expect(store.dispatch).toHaveBeenCalledWith('addFilterCard', {
        configPath: DX,
        isExclusion: false,
        boolFilterContainerId: 'bfc1',
      })
      // One group holding both condition cards = Or(A, B) in the IFR.
      expect(groups).toEqual([['patient'], [`${DX}.1`, `${DX}.2`]])
      expect(res.cardGroups).toEqual([
        { cards: [{ filterCardId: 'patient', name: 'patient' }] },
        {
          cards: [
            { filterCardId: `${DX}.1`, name: `${DX}.1` },
            { filterCardId: `${DX}.2`, name: `${DX}.2` },
          ],
        },
      ])
      // ...and the sinusitis filter is on the NEW card only — the first card's
      // concept set is not restated, which would have made it "both conditions".
      const con = Object.values(constraints).find((c: any) => c.parent === `${DX}.2`) as any
      expect(con.props.value).toEqual([
        { value: '42', text: 'Sinusitis', display_value: 'Sinusitis', includeDescendants: false },
      ])
      expect(Object.values(constraints)).toHaveLength(1)
    })

    it('resolves orWith against a ref created earlier in the same patch', async () => {
      const { store, groups } = makeStore({ existingCards: ['patient'] })
      await applyCohortPatch(store, [
        { op: 'add_card', cardConfigPath: DX, ref: 'a' },
        { op: 'add_card', cardConfigPath: DX, ref: 'b', orWith: 'a' },
      ])
      expect(groups).toEqual([['patient'], [`${DX}.1`, `${DX}.2`]])
    })

    it('refuses to OR a card with Basic Data (it would match every patient)', async () => {
      const { store, groups } = makeStore({ existingCards: ['patient'] })
      await expect(
        applyCohortPatch(store, [{ op: 'add_card', cardConfigPath: DX, orWith: 'patient' }])
      ).rejects.toThrow(/Basic Data/)
      expect(groups).toEqual([['patient']])
    })

    it('refuses to OR an exclusion card with an inclusion one', async () => {
      const { store } = makeStore({ existingCards: ['patient', `${DX}.1`] })
      await expect(
        applyCohortPatch(store, [{ op: 'add_card', cardConfigPath: DX, exclude: true, orWith: `${DX}.1` }])
      ).rejects.toThrow(/exclusion/)
    })

    it('set_card_join OR merges a card already on the cohort into the preceding group', async () => {
      const { store, groups } = makeStore({ existingCards: ['patient', `${DX}.1`, `${DX}.2`] })
      const res = await applyCohortPatch(store, [{ op: 'set_card_join', card: `${DX}.2`, join: 'OR' }])

      expect(groups).toEqual([['patient'], [`${DX}.1`, `${DX}.2`]])
      expect(res.cardGroups?.[1].cards.map(c => c.filterCardId)).toEqual([`${DX}.1`, `${DX}.2`])
    })

    it('set_card_join AND splits an OR-ed card back into its own group', async () => {
      const { store, groups } = makeStore({ existingGroups: [['patient'], [`${DX}.1`, `${DX}.2`]] })
      await applyCohortPatch(store, [{ op: 'set_card_join', card: `${DX}.2`, join: 'AND' }])

      expect(groups).toEqual([['patient'], [`${DX}.1`], [`${DX}.2`]])
    })

    it('is a no-op when the requested join is already in place', async () => {
      const { store, groups } = makeStore({ existingGroups: [['patient'], [`${DX}.1`, `${DX}.2`]] })
      await applyCohortPatch(store, [{ op: 'set_card_join', card: `${DX}.2`, join: 'OR' }])
      expect(groups).toEqual([['patient'], [`${DX}.1`, `${DX}.2`]])
      expect(store.dispatch).not.toHaveBeenCalledWith('toggleFilterContainerBooleanCondition', expect.anything())
    })

    it('refuses to OR the first filter card with Basic Data before it', async () => {
      const { store, groups } = makeStore({ existingCards: ['patient', `${DX}.1`] })
      await expect(
        applyCohortPatch(store, [{ op: 'set_card_join', card: `${DX}.1`, join: 'OR' }])
      ).rejects.toThrow(/Basic Data/)
      expect(groups).toEqual([['patient'], [`${DX}.1`]])
    })

    it('refuses to change the join on the Basic Data card itself', async () => {
      const { store, groups } = makeStore({ existingCards: ['patient', `${DX}.1`] })
      await expect(
        applyCohortPatch(store, [{ op: 'set_card_join', card: 'patient', join: 'OR' }])
      ).rejects.toThrow(/Basic Data card is always AND-ed/)
      expect(groups).toEqual([['patient'], [`${DX}.1`]])
    })

    it('rejects an invalid join value', async () => {
      const { store } = makeStore({ existingCards: ['patient', `${DX}.1`, `${DX}.2`] })
      await expect(
        applyCohortPatch(store, [{ op: 'set_card_join', card: `${DX}.2`, join: 'XOR' } as any])
      ).rejects.toThrow(/must be "AND" or "OR"/)
    })

    it('undoes a grouping change when a later op fails (atomic)', async () => {
      const { store, groups } = makeStore({ existingCards: ['patient', `${DX}.1`, `${DX}.2`] })
      await expect(
        applyCohortPatch(store, [
          { op: 'set_card_join', card: `${DX}.2`, join: 'OR' },
          { op: 'add_constraint', card: 'ghost', attributePath: `${DX}.attributes.condition`, value: 1 },
        ])
      ).rejects.toThrow(/Unknown card/)

      expect(groups).toEqual([['patient'], [`${DX}.1`], [`${DX}.2`]])
    })

    it('keeps the chart axes when OR-ing clears them (resetAxes fires on grouped cards)', async () => {
      // resetAxes clears every axis bound to a card in a container that now holds
      // more than one card. Left cleared, the chart query goes out with an empty
      // axisSelection and the patient count renders "--".
      const axes = [{ props: { attributeId: `${DX}.attributes.startdate`, filterCardId: `${DX}.1`, key: 'startdate' } }]
      const { store } = makeStore({ existingCards: ['patient', `${DX}.1`], axes })
      // The real resetAxes runs inside addFilterCard; the mock triggers it here.
      store.dispatch.mockImplementation(
        (
          (inner: any) => (type: string, payload: any) => {
            const res = inner(type, payload)
            if (type === 'addFilterCard' && payload.boolFilterContainerId) {
              axes[0].props = { attributeId: '', filterCardId: '', key: '' }
            }
            return res
          }
        )(store.dispatch.getMockImplementation())
      )

      await applyCohortPatch(store, [{ op: 'add_card', cardConfigPath: DX, orWith: `${DX}.1` }])

      expect(axes[0].props).toMatchObject({
        attributeId: `${DX}.attributes.startdate`,
        filterCardId: `${DX}.1`,
      })
    })
  })

  describe('concept-set domain', () => {
    const DX = 'patient.interactions.conditionoccurrence'
    const VISIT = 'patient.interactions.visit'
    const DX_SET = `${DX}.attributes.conditionconceptset`
    const VISIT_SET = `${VISIT}.attributes.visitconceptset`
    const domains = { [DX_SET]: 'Condition', [VISIT_SET]: 'Visit' }

    // "Alzheimer's OR an ER visit": the model OR-ed the Visit card correctly and
    // then filled its concept set with the Alzheimer's set it already had in
    // context, never resolving "ER visit". The cohort computes, so nothing looks
    // wrong — it just answers a different question.
    const carriedOverPatch: PatchOp[] = [
      { op: 'add_card', cardConfigPath: VISIT, ref: 'v', orWith: `${DX}.1` },
      { op: 'add_constraint', card: 'v', attributePath: VISIT_SET, value: { conceptSetId: 41 } },
    ]

    const withAlzheimers = async () => {
      const made = makeStore({ existingCards: ['patient', `${DX}.1`], domains })
      await applyCohortPatch(made.store, [
        {
          op: 'add_constraint',
          card: `${DX}.1`,
          attributePath: DX_SET,
          value: { conceptSetId: 41, displayValue: "Alzheimer's disease" },
        },
      ])
      return made
    }

    it("rejects carrying a Condition concept set onto a Visit card's concept set", async () => {
      const { store, constraints } = await withAlzheimers()

      await expect(applyCohortPatch(store, carriedOverPatch)).rejects.toThrow(
        /Concept set 41 is already filtered on .*conditionconceptset.*Condition-domain.*Visit-domain/s
      )
      // Atomic: the half-built Visit card is gone, and the Alzheimer's filter stands.
      const visitConstraint = Object.values(constraints).find((c: any) => c.parent.startsWith(VISIT))
      expect(visitConstraint).toBeUndefined()
      expect(Object.values(constraints)).toHaveLength(1)
    })

    it('rolls the OR-ed card back out of the group when its value is rejected', async () => {
      const { store, groups } = await withAlzheimers()
      await expect(applyCohortPatch(store, carriedOverPatch)).rejects.toThrow(/Concept set 41/)
      expect(groups).toEqual([['patient'], [`${DX}.1`]])
    })

    it('allows the same concept set on two cards of the SAME domain (primary + secondary diagnosis)', async () => {
      const { store } = await withAlzheimers()
      const res = await applyCohortPatch(store, [
        { op: 'add_card', cardConfigPath: DX, ref: 'dx2', orWith: `${DX}.1` },
        { op: 'add_constraint', card: 'dx2', attributePath: DX_SET, value: { conceptSetId: 41 } },
      ])
      expect(res.applied).toBe(true)
    })

    it('allows a different concept set on the Visit card — the correct fix', async () => {
      const { store, constraints } = await withAlzheimers()
      const res = await applyCohortPatch(store, [
        { op: 'add_card', cardConfigPath: VISIT, ref: 'v', orWith: `${DX}.1` },
        {
          op: 'add_constraint',
          card: 'v',
          attributePath: VISIT_SET,
          value: { conceptSetId: 88, displayValue: 'Emergency Room Visit' },
        },
      ])
      expect(res.applied).toBe(true)
      const visitConstraint = Object.values(constraints).find((c: any) => c.parent.startsWith(VISIT)) as any
      expect(visitConstraint.props.value[0]).toMatchObject({ value: '88', text: 'Emergency Room Visit' })
    })

    it('skips the check when the config exposes no domain for the attribute', async () => {
      // domainFilter is empty on plenty of attributes (and absent on non-OMOP
      // configs); an unknown domain must not block a legitimate patch.
      const { store } = makeStore({ existingCards: ['patient', `${DX}.1`] })
      await applyCohortPatch(store, [
        { op: 'add_constraint', card: `${DX}.1`, attributePath: DX_SET, value: { conceptSetId: 41 } },
      ])
      const res = await applyCohortPatch(store, carriedOverPatch)
      expect(res.applied).toBe(true)
    })
  })

  it('restores a date range when a later op fails — the state lives in fromDate/toDate', async () => {
    // Date/time constraints are written by updateDateConstraintValue into
    // props.fromDate.value / props.toDate.value and have no props.value at all, so
    // rollback bookkeeping that snapshots only `value` recorded undefined and
    // restored nothing: the patch threw, and the widened window stayed on the
    // cohort. The user is told nothing was applied, and a later save persists a
    // date range nobody asked for.
    const DX = 'patient.interactions.conditionoccurrence'
    const STARTDATE = `${DX}.attributes.startdate`
    const { store, constraints } = makeStore({ existingCards: ['patient', `${DX}.1`] })

    // Patch 1 commits the window the cohort arrives with (as opening a saved
    // cohort would) — the constraint therefore pre-exists patch 2.
    await applyCohortPatch(store, [
      {
        op: 'add_constraint',
        card: `${DX}.1`,
        attributePath: STARTDATE,
        value: { from: '2019-01-01', to: '2019-12-31' },
      },
    ])
    const con = Object.values(constraints).find((c: any) => c.props.attrKey === 'startdate') as any
    const before = { from: con.props.fromDate.value, to: con.props.toDate.value }
    expect(before.from).toBeInstanceOf(Date)
    expect(con.props.value).toBeUndefined()

    // Patch 2 widens the window, then fails on the next op.
    await expect(
      applyCohortPatch(store, [
        {
          op: 'add_constraint',
          card: `${DX}.1`,
          attributePath: STARTDATE,
          value: { from: '2015-01-01', to: '2020-12-31' },
        },
        { op: 'add_constraint', card: 'ghost', attributePath: `${DX}.attributes.condition`, value: 1 },
      ])
    ).rejects.toThrow(/Unknown card/)

    expect(con.props.fromDate.value).toEqual(before.from)
    expect(con.props.toDate.value).toEqual(before.to)
    // isUTC:true is the pass-through branch; isUTC:false shifts by the timezone
    // offset on every call, so a revert using it would move the restored range.
    expect(store.dispatch).toHaveBeenCalledWith('updateDateConstraintValue', {
      constraintId: con.id,
      fromDateValue: before.from,
      toDateValue: before.to,
      isUTC: true,
    })
  })

  describe('removals', () => {
    const DX = 'patient.interactions.conditionoccurrence'
    const DX_SET = `${DX}.attributes.conditionconceptset`

    const withAlzheimers = async () => {
      const made = makeStore({ existingCards: ['patient', `${DX}.1`] })
      await applyCohortPatch(made.store, [
        { op: 'add_constraint', card: 'patient', attributePath: 'patient.attributes.age', value: '>=65' },
        {
          op: 'add_constraint',
          card: `${DX}.1`,
          attributePath: DX_SET,
          value: { conceptSetId: 41, displayValue: "Alzheimer's disease" },
        },
      ])
      return made
    }

    it('removes one constraint and leaves the card\'s other filters alone', async () => {
      const { store, constraints } = await withAlzheimers()
      const res = await applyCohortPatch(store, [{ op: 'remove_constraint', card: `${DX}.1`, attributePath: DX_SET }])

      expect(res.applied).toBe(true)
      expect(Object.values(constraints).map((c: any) => c.props.attrKey)).toEqual(['age'])
    })

    it('is a no-op when the constraint to remove is not on the card', async () => {
      const { store } = makeStore({ existingCards: ['patient'] })
      const res = await applyCohortPatch(store, [
        { op: 'remove_constraint', card: 'patient', attributePath: 'patient.attributes.age' },
      ])

      expect(res.applied).toBe(true)
      expect(store.dispatch).not.toHaveBeenCalledWith('deleteFilterCardConstraint', expect.anything())
    })

    it('puts a removed constraint back — value and all — when a later op fails', async () => {
      // Atomic has to mean the filter the user had comes back, not merely that
      // nothing new was added. A patch that widens a cohort by dropping a filter and
      // then fails would otherwise leave it permanently widened while telling the
      // user nothing was applied.
      const { store, constraints } = await withAlzheimers()

      await expect(
        applyCohortPatch(store, [
          { op: 'remove_constraint', card: `${DX}.1`, attributePath: DX_SET },
          { op: 'add_constraint', card: 'ghost', attributePath: 'patient.attributes.age', value: 1 },
        ])
      ).rejects.toThrow(/Unknown card/)

      const con = Object.values(constraints).find((c: any) => c.props.attrKey === 'conditionconceptset') as any
      expect(con.props.value).toEqual([
        { value: '41', text: "Alzheimer's disease", display_value: "Alzheimer's disease", includeDescendants: false },
      ])
    })

    it('removes a card — and leaves it removed when a later op fails', async () => {
      // The one op revert cannot undo: re-adding the card would mint a new instance
      // id and lose the constraints that hung off it. Pinned here so the limitation
      // stays a decision (documented on applyCohortPatch) rather than a surprise.
      const { store, cards, groups } = makeStore({ existingCards: ['patient', `${DX}.1`] })

      await expect(
        applyCohortPatch(store, [
          { op: 'remove_card', card: `${DX}.1` },
          { op: 'add_constraint', card: 'ghost', attributePath: 'patient.attributes.age', value: 1 },
        ])
      ).rejects.toThrow(/Unknown card/)

      expect(Object.keys(cards)).toEqual(['patient'])
      expect(groups).toEqual([['patient']])
    })

    it('does not re-point the chart axes at a card the patch removed', async () => {
      const axes = [
        { props: { attributeId: `${DX}.attributes.startdate`, filterCardId: `${DX}.1`, key: 'startdate' } },
      ]
      const { store } = makeStore({ existingCards: ['patient', `${DX}.1`], axes })

      await expect(
        applyCohortPatch(store, [
          { op: 'remove_card', card: `${DX}.1` },
          { op: 'add_constraint', card: 'ghost', attributePath: 'patient.attributes.age', value: 1 },
        ])
      ).rejects.toThrow(/Unknown card/)

      // Restoring the snapshot here would leave the chart querying an axis bound to
      // a filterCardId the IFR no longer contains.
      expect(axes[0].props).toMatchObject({ attributeId: '', filterCardId: '', key: '' })
    })
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
