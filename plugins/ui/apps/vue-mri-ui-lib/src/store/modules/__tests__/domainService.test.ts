import { vi } from 'vitest'
import domainService from '@/store/modules/domainService'
import * as types from '../../mutation-types'

vi.mock('axios')

describe('store - domainService', () => {
  describe('mutations', () => {
    it('DOMAIN_SET_VALUES', () => {
      const state = { domainValues: {} }

      domainService.mutations[types.DOMAIN_SET_VALUES](state, {
        attributePath: 'patient',
        data: {
          isLoaded: true,
          isLoading: false,
          values: [
            {
              display_value: 'Yes',
              score: 1,
              text: '',
              value: 'Yes',
            },
          ],
        },
      })

      // assert result
      expect(Object.keys(state.domainValues)[0]).toEqual('patient')
    })
  })

  describe('actions', () => {
    describe('loadValuesForAttributePath', () => {
      const rootGettersFixture = {
        getMriConfig: { meta: { configId: 'mock-config-id', configVersion: 'mock-config-version' } },
        getSelectedDataset: { id: 'mock-id' },
      }

      it('refetches on an empty search when the cache holds narrowed search results', async () => {
        const attributePathUid = 'patient.attributes.smoker__123'
        const state = {
          domainValues: {
            [attributePathUid]: {
              isLoaded: true,
              isLoading: false,
              isFullList: false,
              datasetId: 'mock-id',
              values: [{ value: 'fever', score: 1, text: 'fever' }],
            },
          },
        }
        const commit = vi.fn()
        const dispatch = vi.fn(() => Promise.resolve({ data: { data: [{ value: 'all values', score: 1 }] } }))

        await domainService.actions.loadValuesForAttributePath(
          { state, commit, rootGetters: rootGettersFixture, dispatch },
          { attributePathUid, searchQuery: '' }
        )

        expect(dispatch).toHaveBeenCalled()
        const data = commit.mock.calls[commit.mock.calls.length - 1][1].data
        expect(data.isFullList).toBe(true)
        expect(data.values[0].value).toEqual('all values')
      })

      it('reuses the cache on an empty search when it holds the full list', async () => {
        const attributePathUid = 'patient.attributes.smoker__456'
        const cached = [{ value: 'all values', score: 1, text: 'all values' }]
        const state = {
          domainValues: {
            [attributePathUid]: {
              isLoaded: true,
              isLoading: false,
              isFullList: true,
              datasetId: 'mock-id',
              values: cached,
            },
          },
        }
        const commit = vi.fn()
        const dispatch = vi.fn(() => Promise.resolve({ data: { data: [] } }))

        const result = await domainService.actions.loadValuesForAttributePath(
          { state, commit, rootGetters: rootGettersFixture, dispatch },
          { attributePathUid, searchQuery: '' }
        )

        expect(dispatch).not.toHaveBeenCalled()
        expect(result).toEqual(cached)
      })

      it('calls a backendservice if data is not yet loaded', () => {
        const attributePathUid = 'patient.attributes.smoker__123'
        const searchQuery = 'fever'
        const state = {
          domainValues: {},
        }

        // tslint:disable-next-line:no-shadowed-variable
        const commit = vi.fn()

        const rootGetters = {
          getMriConfig: {
            meta: {
              configId: 'mock-config-id',
              configVersion: 'mock-config-version',
            },
          },
          getSelectedDataset: {
            id: 'mock-id',
          },
        }

        const dispatch = (actionName, actionParam) =>
          Promise.resolve({
            data: {
              data: [{ value: 'fever domain value', score: 10 }],
            },
          })

        domainService.actions
          .loadValuesForAttributePath({ state, commit, rootGetters, dispatch }, { attributePathUid, searchQuery })
          .then(() => {
            expect(commit.mock.calls.length).toBe(2)
            expect(commit.mock.calls[0][0]).toBe(types.DOMAIN_SET_VALUES)
            expect(commit.mock.calls[0][1].attributePath).toBe(attributePathUid)
            const prevData = commit.mock.calls[0][1].data
            expect(prevData.isLoaded).toBeTruthy()
            expect(prevData.isLoading).toBeTruthy()
            expect(prevData.values).toEqual([])

            const data = commit.mock.calls[1][1].data
            expect(data.isLoaded).toBeTruthy()
            expect(data.isLoading).toBeFalsy()
            expect(data.values[0].value).toEqual('fever domain value')
          })
      })
    })
  })
})
