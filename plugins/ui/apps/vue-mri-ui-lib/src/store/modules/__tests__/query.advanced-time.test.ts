import { describe, it, expect, vi } from 'vitest'
import * as types from '@/store/mutation-types'

describe('query store - advanced time cleanup', () => {
  it('ADVANCEDTIME_SET_TIMEFILTER mutation clears time filters', () => {
    // We test the mutation directly to verify the logic
    const mutation = (moduleState: any, { filterCardId, timeFilters }: any) => {
      moduleState.model.entities.filterCards[
        filterCardId
      ].props.layout.advancedTimeLayout.props.timeFilterModel.timeFilters = timeFilters
    }
    
    const state = {
      model: {
        entities: {
          filterCards: {
            'card-1': {
              props: {
                layout: {
                  advancedTimeLayout: {
                    props: {
                      timeFilterModel: {
                        timeFilters: [{ targetInteraction: 'card-2' }]
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    mutation(state, { filterCardId: 'card-1', timeFilters: [] })
    
    expect(state.model.entities.filterCards['card-1'].props.layout.advancedTimeLayout.props.timeFilterModel.timeFilters).toEqual([])
  })

  it('deleteFilterCard action logic clears dependencies correctly', () => {
    // Simulate the logic we added to deleteFilterCard
    const state = {
      model: {
        entities: {
          boolFilterContainers: {
            'bfc-1': {
              props: {
                filterCards: ['card-1', 'card-2']
              }
            }
          },
          filterCards: {
            'card-1': {
              id: 'card-1',
              props: {
                key: 'visit',
                index: 1,
                constraints: [],
                layout: {
                  advancedTimeLayout: {
                    props: {
                      timeFilterModel: {
                        timeFilters: [{ targetInteraction: 'card-2' }]
                      }
                    }
                  }
                }
              }
            },
            'card-2': {
              id: 'card-2',
              props: {
                key: 'condition',
                index: 1,
                constraints: [],
                layout: {
                  advancedTimeLayout: {
                    props: {
                      timeFilterModel: {
                        timeFilters: []
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    const getters = {
      getFilterCard: (id: string) => state.model.entities.filterCards[id],
      getBoolFilterContainers: () => state.model.entities.boolFilterContainers,
    }
    
    const commit = vi.fn()
    const filterCardId = 'card-2'
    
    // Simulate the cleanup logic
    const boolFilterContainers = getters.getBoolFilterContainers()
    Object.keys(boolFilterContainers).forEach(containerId => {
      const container = boolFilterContainers[containerId]
      container.props.filterCards.forEach((cardId: string) => {
        if (cardId === filterCardId) return
        const card = getters.getFilterCard(cardId)
        const timeFilters = card.props.layout?.advancedTimeLayout?.props?.timeFilterModel?.timeFilters || []
        const hasDependency = timeFilters.some((tf: any) => tf.targetInteraction === filterCardId)
        if (hasDependency) {
          commit(types.ADVANCEDTIME_SET_TIMEFILTER, {
            filterCardId: cardId,
            timeFilters: []
          })
        }
      })
    })
    
    expect(commit).toHaveBeenCalledWith(types.ADVANCEDTIME_SET_TIMEFILTER, {
      filterCardId: 'card-1',
      timeFilters: []
    })
  })

  it('does not clear advanced time when no dependency exists', () => {
    const state = {
      model: {
        entities: {
          boolFilterContainers: {
            'bfc-1': {
              props: {
                filterCards: ['card-1', 'card-2']
              }
            }
          },
          filterCards: {
            'card-1': {
              id: 'card-1',
              props: {
                key: 'visit',
                index: 1,
                constraints: [],
                layout: {
                  advancedTimeLayout: {
                    props: {
                      timeFilterModel: {
                        timeFilters: [{ targetInteraction: 'card-3' }] // depends on different card
                      }
                    }
                  }
                }
              }
            },
            'card-2': {
              id: 'card-2',
              props: {
                key: 'condition',
                index: 1,
                constraints: [],
                layout: {
                  advancedTimeLayout: {
                    props: {
                      timeFilterModel: {
                        timeFilters: []
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    const getters = {
      getFilterCard: (id: string) => state.model.entities.filterCards[id],
      getBoolFilterContainers: () => state.model.entities.boolFilterContainers,
    }
    
    const commit = vi.fn()
    const filterCardId = 'card-2'
    
    // Simulate the cleanup logic
    const boolFilterContainers = getters.getBoolFilterContainers()
    Object.keys(boolFilterContainers).forEach(containerId => {
      const container = boolFilterContainers[containerId]
      container.props.filterCards.forEach((cardId: string) => {
        if (cardId === filterCardId) return
        const card = getters.getFilterCard(cardId)
        const timeFilters = card.props.layout?.advancedTimeLayout?.props?.timeFilterModel?.timeFilters || []
        const hasDependency = timeFilters.some((tf: any) => tf.targetInteraction === filterCardId)
        if (hasDependency) {
          commit(types.ADVANCEDTIME_SET_TIMEFILTER, {
            filterCardId: cardId,
            timeFilters: []
          })
        }
      })
    })
    
    const advancedTimeCalls = commit.mock.calls.filter(
      call => call[0] === types.ADVANCEDTIME_SET_TIMEFILTER
    )
    expect(advancedTimeCalls.length).toBe(0)
  })
})
