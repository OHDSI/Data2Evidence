import { vi, beforeEach, describe, expect, it } from 'vitest'

vi.mock('axios')
vi.mock('@/lib/CustomPlotly', () => ({ default: { update: vi.fn() } }))
vi.mock('@/store', () => ({
  default: {
    getters: { getText: (key: string) => key },
    dispatch: vi.fn(),
    commit: vi.fn(),
  },
}))

import { setActivePinia, createPinia } from 'pinia'
import queryModule from '@/store/modules/query'
import { useNotificationStore } from '@/stores/notifications'
import BooleanContainers from '@/lib/ifr/BooleanContainers'
import InternalFilterRepresentation from '@/lib/ifr/InternalFilterRepresentation'
import * as types from '@/store/mutation-types'
import KeyCounter from '@/lib/utils/KeyCounter'

const PROC = 'patient.interactions.proc'
const VISIT = 'patient.interactions.visit'
const EPISODE = 'patient.interactions.episode'
const PROC_CARD = `${PROC}.1`
const VISIT_CARD = `${VISIT}.1`
const EPISODE_CARD = `${EPISODE}.1`

const configCards: Record<string, any> = {
  [PROC]: {
    getConfigPath: () => PROC,
    getName: () => 'Procedure Occurrence',
    oInternalConfigFilterCard: {
      parentInteraction: {
        possibleParent: [EPISODE, VISIT],
        parentLabel: '',
        parentInteractionsMapping: [
          { parentInteraction: VISIT, parentMappingInteractionLabel: 'Visit parent' },
          { parentInteraction: EPISODE, parentMappingInteractionLabel: 'Episode parent' },
        ],
      },
    },
  },
  [VISIT]: { getConfigPath: () => VISIT, getName: () => 'Visit' },
  [EPISODE]: { getConfigPath: () => EPISODE, getName: () => 'Episode' },
}

const mriFrontendConfig = {
  getPaConfigId: () => 'cfg-id',
  getPaConfigVersion: () => 'A',
  getFilterCardByPath: (path: string) => configCards[path],
}

function parentConstraint(parentKey: string, value: string | null) {
  const id = `${PROC_CARD}.attributes.parentInteraction_${parentKey}`
  return {
    id,
    props: {
      attrKey: `parentInteraction_${parentKey}`,
      attributePath: `${PROC}.attributes.parentInteraction_${parentKey}`,
      instanceId: id,
      type: 'parentInteraction',
      value: value ? { value, text: '' } : null,
    },
  }
}

function card(key: string, constraintIds: string[]) {
  return {
    props: {
      key,
      name: key,
      index: 1,
      instanceId: `${key}.1`,
      inactive: false,
      isEntry: false,
      isExit: false,
      excludeFilter: false,
      layout: { advancedTimeLayout: { props: { timeFilterModel: { timeFilters: [] } } } },
      constraints: constraintIds,
    },
  }
}

function buildState(constraints: ReturnType<typeof parentConstraint>[]) {
  const constraintMap = Object.fromEntries(constraints.map(c => [c.id, c]))
  return {
    model: {
      result: 'bc-root',
      entities: {
        boolContainers: { 'bc-root': { props: { boolfiltercontainers: ['bfc-1', 'bfc-2'] } } },
        boolFilterContainers: {
          'bfc-1': { props: { filterCards: [PROC_CARD] } },
          'bfc-2': { props: { filterCards: [VISIT_CARD, EPISODE_CARD] } },
        },
        filterCards: {
          [PROC_CARD]: card(PROC, Object.keys(constraintMap)),
          [VISIT_CARD]: card(VISIT, []),
          [EPISODE_CARD]: card(EPISODE, []),
        },
        constraints: constraintMap,
      },
    },
  }
}

function gettersFor(state: ReturnType<typeof buildState>) {
  const { entities } = state.model
  return {
    getBoolContainerRoot: () => state.model.result,
    getBoolContainer: (id: string) => entities.boolContainers[id],
    getBoolFilterContainer: (id: string) => entities.boolFilterContainers[id],
    getBoolFilterContainers: () => entities.boolFilterContainers,
    getFilterCard: (id: string) => entities.filterCards[id],
    getFilterCardConstraints: (cardId: string) =>
      entities.filterCards[cardId].props.constraints.map(id => entities.constraints[id]),
    getConstraints: entities.constraints,
    getAllAxes: [],
    isVariantConstraint: () => false,
  }
}

const rootGetters = {
  getHasAssignedConfig: true,
  getMriFrontendConfig: mriFrontendConfig,
  getText: (key: string) => key,
}

function procCardOf(constraints: ReturnType<typeof parentConstraint>[]) {
  const state = buildState(constraints)
  const ifr: any = queryModule.getters.getIFR(state as any, gettersFor(state) as any, {} as any, rootGetters as any)
  return ifr.cards.content[0].content[0]
}

describe('store - query - parent interactions', () => {
  describe('getIFR', () => {
    it('sends no parent when no field has a value', () => {
      expect(procCardOf([]).parentInteraction).toBeUndefined()
      expect(procCardOf([parentConstraint('visit', null)]).parentInteraction).toBeUndefined()
    })

    it('sends one parent as an array of one', () => {
      expect(procCardOf([parentConstraint('visit', VISIT_CARD)]).parentInteraction).toEqual([VISIT_CARD])
    })

    it('sends two parents in config order', () => {
      const procCard = procCardOf([parentConstraint('visit', VISIT_CARD), parentConstraint('episode', EPISODE_CARD)])
      expect(procCard.parentInteraction).toEqual([EPISODE_CARD, VISIT_CARD])
    })

    it('keeps each field as an empty attribute with a stable id', () => {
      const procCard = procCardOf([parentConstraint('visit', VISIT_CARD), parentConstraint('episode', null)])
      const attributes = procCard.attributes.content
      expect(attributes.map(a => a.instanceID)).toEqual([
        `${PROC_CARD}.attributes.parentInteraction_visit`,
        `${PROC_CARD}.attributes.parentInteraction_episode`,
      ])
      expect(attributes.every(a => a.constraints.content.length === 0)).toBe(true)
    })
  })

  describe('deleteFilterCard', () => {
    beforeEach(() => {
      KeyCounter.getKeyCountingStrategy('default', 1)
      KeyCounter.getInstance().blockIndexFor(VISIT, 1)
      KeyCounter.getInstance().blockIndexFor(EPISODE, 1)
    })

    it('clears every parent field that points to the removed card', () => {
      const state = buildState([parentConstraint('visit', VISIT_CARD), parentConstraint('episode', EPISODE_CARD)])
      const commit = vi.fn()
      queryModule.actions.deleteFilterCard({ commit, getters: gettersFor(state), dispatch: vi.fn() } as any, {
        filterCardId: VISIT_CARD,
      })
      const cleared = commit.mock.calls.filter(([type]) => type === types.CONSTRAINTS_SET_VALUE).map(([, p]) => p)
      expect(cleared).toEqual([{ constraintId: `${PROC_CARD}.attributes.parentInteraction_visit`, value: null }])
    })

    it('does not fail on an empty parent field', () => {
      const state = buildState([parentConstraint('visit', null), parentConstraint('episode', EPISODE_CARD)])
      const commit = vi.fn()
      expect(() =>
        queryModule.actions.deleteFilterCard({ commit, getters: gettersFor(state), dispatch: vi.fn() } as any, {
          filterCardId: EPISODE_CARD,
        })
      ).not.toThrow()
      const cleared = commit.mock.calls.filter(([type]) => type === types.CONSTRAINTS_SET_VALUE).map(([, p]) => p)
      expect(cleared).toEqual([{ constraintId: `${PROC_CARD}.attributes.parentInteraction_episode`, value: null }])
    })
  })

  describe('setIFRState', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      KeyCounter.getKeyCountingStrategy('default', 1)
    })

    function ifrWithParents(parentInteraction: string[]) {
      const procCard = new InternalFilterRepresentation.FilterCard({
        configPath: PROC,
        instanceNumber: 1,
        instanceID: PROC_CARD,
        name: 'Procedure A',
        parentInteraction,
        attributes: new BooleanContainers.And([]),
      })
      return new InternalFilterRepresentation.Filter({
        configMetadata: new InternalFilterRepresentation.ConfigMetadata('A', 'cfg-id'),
        cards: new BooleanContainers.And([new BooleanContainers.Or([procCard])]),
      })
    }

    const configWithCards = {
      ...mriFrontendConfig,
      getUnmodified: () => ({}),
      getFilterCardByPath: (path: string) =>
        configCards[path] && { getFilterAttributes: () => [], hasAnnotation: () => false, ...configCards[path] },
    }

    async function load(parentInteraction: string[]) {
      const alert = vi.spyOn(useNotificationStore(), 'setAlertMessage')
      await queryModule.actions.setIFRState(
        {
          commit: vi.fn(),
          dispatch: vi.fn(),
          rootGetters: { getMriFrontendConfig: configWithCards, getText: (key: string, p?: string) => `${key}:${p}` },
        } as any,
        { ifr: ifrWithParents(parentInteraction) }
      )
      return alert
    }

    it('shows a warning when a parent link is dropped', async () => {
      const alert = await load(['patient.interactions.visitdetail.1'])
      expect(alert).toHaveBeenCalledWith({
        messageType: 'warning',
        message: 'MRI_PA_PARENT_LINK_DROPPED:Procedure A to patient.interactions.visitdetail.1',
      })
    })

    it('shows no warning when every link is kept', async () => {
      const alert = await load([VISIT_CARD])
      expect(alert).not.toHaveBeenCalled()
    })
  })
})
