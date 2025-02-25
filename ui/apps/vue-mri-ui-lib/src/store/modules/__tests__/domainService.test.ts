import domainService from '@/store/modules/domainService'
import * as types from '../../mutation-types'
jest.mock('axios')

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
      it('calls a backendservice if data is not yet loaded', () => {
        const attributePathUid = 'patient.attributes.smoker__123'
        const searchQuery = 'fever'
        const state = {
          domainValues: {},
        }

        // tslint:disable-next-line:no-shadowed-variable
        const commit = jest.fn()

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
