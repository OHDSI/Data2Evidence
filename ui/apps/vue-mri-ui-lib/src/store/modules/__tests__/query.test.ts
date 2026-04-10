import { vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('axios')
vi.mock('@/store', () => ({
  default: {
    getters: {},
    dispatch: vi.fn(),
    commit: vi.fn(),
  },
}))

import queryModule from '@/store/modules/query'
import * as types from '@/store/mutation-types'
import KeyCounter from '@/lib/utils/KeyCounter'

function buildMockMriFrontendConfig(
  filterCards: Record<string, { name: string; attributes: Array<{ key: string; type: string; name: string }> }> = {}
) {
  const makeAttrConfig = (attr: { key: string; type: string; name: string }) => ({
    getConfigKey: () => attr.key,
    getType: () => attr.type,
    getName: () => attr.name,
    isInitialInFilterCard: () => true,
    getDomainFilter: () => null,
    getStandardConceptCodeFilter: () => null,
  })

  const makeFilterCardConfig = (
    path: string,
    config: { name: string; attributes: Array<{ key: string; type: string; name: string }> }
  ) => ({
    getName: () => config.name,
    getConfigPath: () => path,
    hasAnnotation: () => false,
    isBasicData: () => path === 'patient',
    getFilterAttributes: () => config.attributes.map(makeAttrConfig),
  })

  return {
    getFilterCardByPath: (path: string) => {
      const config = filterCards[path]
      if (!config) {
        return {
          getName: () => path,
          getConfigPath: () => path,
          hasAnnotation: () => false,
          isBasicData: () => false,
          getFilterAttributes: () => [],
        }
      }
      return makeFilterCardConfig(path, config)
    },
    getUnmodified: () => ({}),
    getFilterCards: () => Object.entries(filterCards).map(([path, config]) => makeFilterCardConfig(path, config)),
    getPaConfigId: () => 'test-config-id',
    getPaConfigVersion: () => 'A',
  }
}

function buildToggleContext(state: { model: { result: string; entities: Record<string, Record<string, any>> } }) {
  const dispatch = vi.fn()
  return {
    dispatch,
    context: {
      commit: vi.fn(),
      dispatch,
      getters: {
        getBoolContainer: (id: string) =>
          state.model.entities.boolContainers[id] || { props: { boolfiltercontainers: [] } },
        getBoolFilterContainer: (id: string) =>
          state.model.entities.boolFilterContainers[id] || { props: { filterCards: [] } },
        getEntities: state.model.entities,
        getBoolContainerRoot: () => state.model.result,
      },
    },
  }
}

describe('store - query', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    KeyCounter.getKeyCountingStrategy('default', 1)
  })

  describe('actions', () => {
    describe('addFilterCard', () => {
      it('adds a visit filter card to a new BoolFilterContainer', async () => {
        const state = {
          model: {
            result: 'bc-root',
            entities: {
              boolContainers: {
                'bc-root': { id: 'bc-root', props: { type: 'boolcontainer', boolfiltercontainers: ['bfc-basic'] } },
              },
              boolFilterContainers: {
                'bfc-basic': {
                  id: 'bfc-basic',
                  props: { type: 'boolfiltercontainer', op: 'OR', filterCards: ['patient'] },
                },
              },
              filterCards: {
                patient: {
                  id: 'patient',
                  props: { key: 'patient', name: 'Basic Data', excludeFilter: false, constraints: [] },
                },
              } as Record<string, any>,
              constraints: {},
            },
          },
        }

        const mriFrontendConfig = buildMockMriFrontendConfig({
          'patient.interactions.visit': {
            name: 'Visit',
            attributes: [{ key: 'visitconceptset', type: 'text', name: 'Visit Concept Set' }],
          },
        })

        const commit = vi.fn((type, payload) => {
          if (type === types.FILTERCARD_ADD && payload.filterCardsToAdd) {
            Object.assign(state.model.entities.filterCards, payload.filterCardsToAdd)
          }
        })
        const dispatch = vi.fn()
        const getters = {
          getBoolContainer: (id: string) =>
            state.model.entities.boolContainers[id] || { props: { boolfiltercontainers: [] } },
          getBoolFilterContainer: (id: string) =>
            state.model.entities.boolFilterContainers[id] || { props: { filterCards: [] } },
          getEntities: state.model.entities,
          getBoolContainerRoot: () => state.model.result,
          getMriFrontendConfig: mriFrontendConfig,
          isVariantConstraint: () => false,
          getVariantFilterCards: [],
          getFilterCard: (id: string) => state.model.entities.filterCards[id],
          getText: (key: string) => key,
        }

        await queryModule.actions.addFilterCard({ getters, commit, dispatch } as any, {
          boolFilterContainerId: undefined,
          configPath: 'patient.interactions.visit',
        })

        const setBoolContainerCall = dispatch.mock.calls.find(([action]) => action === 'setBoolContainerState')
        expect(setBoolContainerCall).toBeTruthy()
        expect(setBoolContainerCall[1].props.boolfiltercontainers).toHaveLength(2)

        const filterCardAddCall = commit.mock.calls.find(([type]) => type === types.FILTERCARD_ADD)
        expect(filterCardAddCall).toBeTruthy()
        const addedCard = filterCardAddCall[1].filterCardsToAdd[Object.keys(filterCardAddCall[1].filterCardsToAdd)[0]]
        expect(addedCard.props.key).toBe('patient.interactions.visit')
        expect(addedCard.props.name).toBe('Visit A')
        expect(addedCard.props.excludeFilter).toBe(false)
      })
    })

    describe('toggleFilterContainerBooleanCondition', () => {
      it('merges two visit groups when toggling AND to OR', () => {
        const state = {
          model: {
            result: 'bc-root',
            entities: {
              boolContainers: {
                'bc-root': {
                  id: 'bc-root',
                  props: { type: 'boolcontainer', boolfiltercontainers: ['bfc-basic', 'bfc-visit1', 'bfc-visit2'] },
                },
              },
              boolFilterContainers: {
                'bfc-basic': {
                  id: 'bfc-basic',
                  props: { type: 'boolfiltercontainer', op: 'OR', filterCards: ['patient'] },
                },
                'bfc-visit1': {
                  id: 'bfc-visit1',
                  props: { type: 'boolfiltercontainer', op: 'OR', filterCards: ['patient.interactions.visit.1'] },
                },
                'bfc-visit2': {
                  id: 'bfc-visit2',
                  props: { type: 'boolfiltercontainer', op: 'OR', filterCards: ['patient.interactions.visit.2'] },
                },
              },
              filterCards: {
                patient: {
                  id: 'patient',
                  props: { key: 'patient', name: 'Basic Data', excludeFilter: false, constraints: [] },
                },
                'patient.interactions.visit.1': {
                  id: 'patient.interactions.visit.1',
                  props: { key: 'patient.interactions.visit', name: 'Visit A', excludeFilter: false, constraints: [] },
                },
                'patient.interactions.visit.2': {
                  id: 'patient.interactions.visit.2',
                  props: { key: 'patient.interactions.visit', name: 'Visit B', excludeFilter: false, constraints: [] },
                },
              },
              constraints: {},
            },
          },
        }

        const { dispatch, context } = buildToggleContext(state)

        queryModule.actions.toggleFilterContainerBooleanCondition(context as any, {
          filterContainerId: 'bfc-visit2',
          operator: 'OR',
          parentId: 'bc-root',
        })

        const boolContainerModel = dispatch.mock.calls.find(([action]) => action === 'setBoolContainerState')![1]
        expect(boolContainerModel.props.boolfiltercontainers).toHaveLength(2)

        const mergedContainer = boolContainerModel.props.boolfiltercontainers[1]
        const mergedCardIds = mergedContainer.props.filterCards.map((fc: any) => fc.id)
        expect(mergedCardIds).toContain('patient.interactions.visit.1')
        expect(mergedCardIds).toContain('patient.interactions.visit.2')
      })

      it('merges visit group into basic data group when toggling AND to OR', () => {
        const state = {
          model: {
            result: 'bc-root',
            entities: {
              boolContainers: {
                'bc-root': {
                  id: 'bc-root',
                  props: { type: 'boolcontainer', boolfiltercontainers: ['bfc-basic', 'bfc-visit'] },
                },
              },
              boolFilterContainers: {
                'bfc-basic': {
                  id: 'bfc-basic',
                  props: { type: 'boolfiltercontainer', op: 'OR', filterCards: ['patient'] },
                },
                'bfc-visit': {
                  id: 'bfc-visit',
                  props: { type: 'boolfiltercontainer', op: 'OR', filterCards: ['patient.interactions.visit.1'] },
                },
              },
              filterCards: {
                patient: {
                  id: 'patient',
                  props: { key: 'patient', name: 'Basic Data', excludeFilter: false, constraints: [] },
                },
                'patient.interactions.visit.1': {
                  id: 'patient.interactions.visit.1',
                  props: { key: 'patient.interactions.visit', name: 'Visit A', excludeFilter: false, constraints: [] },
                },
              },
              constraints: {},
            },
          },
        }

        const { dispatch, context } = buildToggleContext(state)

        queryModule.actions.toggleFilterContainerBooleanCondition(context as any, {
          filterContainerId: 'bfc-visit',
          operator: 'OR',
          parentId: 'bc-root',
        })

        expect(dispatch).toHaveBeenCalledWith('setBoolContainerState', expect.any(Object))

        const boolContainerModel = dispatch.mock.calls.find(([action]) => action === 'setBoolContainerState')![1]
        expect(boolContainerModel.props.boolfiltercontainers).toHaveLength(1)

        const mergedContainer = boolContainerModel.props.boolfiltercontainers[0]
        const mergedCardIds = mergedContainer.props.filterCards.map((fc: any) => fc.id)
        expect(mergedCardIds).toContain('patient')
        expect(mergedCardIds).toContain('patient.interactions.visit.1')
      })

      // State: Basic Data AND Visit AND NOT(Death) AND Measurement
      // This is the setup for the #1971 bug scenario
      function buildVisitDeathMeasurementState() {
        return {
          model: {
            result: 'bc-root',
            entities: {
              boolContainers: {
                'bc-root': {
                  id: 'bc-root',
                  props: {
                    type: 'boolcontainer',
                    boolfiltercontainers: ['bfc-basic', 'bfc-visit', 'bfc-death', 'bfc-measurement'],
                  },
                },
              },
              boolFilterContainers: {
                'bfc-basic': {
                  id: 'bfc-basic',
                  props: { type: 'boolfiltercontainer', op: 'OR', filterCards: ['patient'] },
                },
                'bfc-visit': {
                  id: 'bfc-visit',
                  props: { type: 'boolfiltercontainer', op: 'OR', filterCards: ['patient.interactions.visit.1'] },
                },
                'bfc-death': {
                  id: 'bfc-death',
                  props: { type: 'boolfiltercontainer', op: 'OR', filterCards: ['patient.interactions.death.1'] },
                },
                'bfc-measurement': {
                  id: 'bfc-measurement',
                  props: { type: 'boolfiltercontainer', op: 'OR', filterCards: ['patient.interactions.measurement.1'] },
                },
              },
              filterCards: {
                patient: {
                  id: 'patient',
                  props: { key: 'patient', name: 'Basic Data', excludeFilter: false, constraints: [] },
                },
                'patient.interactions.visit.1': {
                  id: 'patient.interactions.visit.1',
                  props: { key: 'patient.interactions.visit', name: 'Visit A', excludeFilter: false, constraints: [] },
                },
                'patient.interactions.death.1': {
                  id: 'patient.interactions.death.1',
                  props: { key: 'patient.interactions.death', name: 'Death A', excludeFilter: true, constraints: [] },
                },
                'patient.interactions.measurement.1': {
                  id: 'patient.interactions.measurement.1',
                  props: {
                    key: 'patient.interactions.measurement',
                    name: 'Measurement A',
                    excludeFilter: false,
                    constraints: [],
                  },
                },
              },
              constraints: {},
            },
          },
        }
      }

      it('visit + exclusion death + measurement produces 4 containers', () => {
        const state = buildVisitDeathMeasurementState()
        expect(Object.keys(state.model.entities.boolFilterContainers)).toHaveLength(4)
        expect(state.model.entities.filterCards['patient.interactions.death.1'].props.excludeFilter).toBe(true)
        expect(state.model.entities.filterCards['patient.interactions.visit.1'].props.excludeFilter).toBe(false)
        expect(state.model.entities.filterCards['patient.interactions.measurement.1'].props.excludeFilter).toBe(false)
      })

      // #1971: When toggling AND→OR on the measurement container (from inclusion view),
      // the merge should target the previous INCLUSION container (visit), not the
      // previous container by array index (death/exclusion).
      it('merges measurement with visit (not death) when toggling inclusion AND to OR (#1971)', () => {
        const state = buildVisitDeathMeasurementState()
        const { dispatch, context } = buildToggleContext(state)

        queryModule.actions.toggleFilterContainerBooleanCondition(context as any, {
          filterContainerId: 'bfc-measurement',
          operator: 'OR',
          parentId: 'bc-root',
        })

        const boolContainerModel = dispatch.mock.calls.find(([action]) => action === 'setBoolContainerState')![1]
        // Should have 3 containers: basic, visit+measurement merged, death
        expect(boolContainerModel.props.boolfiltercontainers).toHaveLength(3)

        // Visit container should now contain both visit AND measurement
        const visitContainer = boolContainerModel.props.boolfiltercontainers.find((c: any) =>
          c.props.filterCards.some((fc: any) => fc.id === 'patient.interactions.visit.1')
        )
        expect(visitContainer).toBeTruthy()
        const visitCardIds = visitContainer.props.filterCards.map((fc: any) => fc.id)
        expect(visitCardIds).toContain('patient.interactions.visit.1')
        expect(visitCardIds).toContain('patient.interactions.measurement.1')

        // Death container should remain untouched with only the death card
        const deathContainer = boolContainerModel.props.boolfiltercontainers.find((c: any) =>
          c.props.filterCards.some((fc: any) => fc.id === 'patient.interactions.death.1')
        )
        expect(deathContainer).toBeTruthy()
        const deathCardIds = deathContainer.props.filterCards.map((fc: any) => fc.id)
        expect(deathCardIds).toEqual(['patient.interactions.death.1'])
        expect(deathCardIds).not.toContain('patient.interactions.measurement.1')
      })
    })
  })
})
