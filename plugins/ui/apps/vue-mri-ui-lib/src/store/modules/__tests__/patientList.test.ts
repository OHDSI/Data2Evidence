import QueryString from '../../../utils/QueryString'
import * as types from '../../mutation-types'
import patientList from '../patientList'
jest.mock('axios')
jest.mock('../../../utils/QueryString')

describe('store - patientList', () => {
  describe('actions', () => {
    describe('getPatientCount', () => {
      it('calls a backendservice', () => {
        QueryString.prototype = jest.fn().mockImplementationOnce(() => '')

        const dispatch = jest.fn((actionName, actionParam) =>
          Promise.resolve({
            data: {
              data: 'mock data',
            },
          })
        )

        const rootGetters = {
          getSelectedDataset: {
            id: 'mock-id',
          },
          getSelectedDatasetVersion: {
            id: 'mock-id',
          },
        }

        patientList.actions.getPatientCount({ dispatch, rootGetters }, { params: {} }).then(() => {
          expect(dispatch).toHaveBeenCalledTimes(1)
          expect(QueryString).toHaveBeenCalledTimes(1)
        })
      })
    })
  })
  describe('mutations', () => {
    let state
    beforeEach(() => {
      state = {
        request: {
          cohortDefinition: {
            cards: {},
            axes: [],
            configData: {
              configId: null,
              configVersion: null,
            },
            guarded: true,
            limit: 0,
            offset: 0,
          },
        },
        totalPatientListCount: 0,
        dataModel: {
          resultDefinition: {
            selected_attributes: {},

            // configPath to sort
            sorted_attributes: '',

            // sorting direction 'A' or 'D',
            sorting_directions: '',
          },
          pageSize: 20,
          currentPage: 1,
          noDataReason: '',
        },
        columnSelectionMenu: [],
        columnWidths: {},
      }
    })

    it('SET_TOTAL_PATIENT_LIST_COUNT', () => {
      patientList.mutations[types.SET_TOTAL_PATIENT_LIST_COUNT](state, {
        totalPatientListCount: 123,
      })
      expect(state.totalPatientListCount).toEqual(123)
    })
    it('PL_SET_REQUEST', () => {
      patientList.mutations[types.PL_SET_REQUEST](state, {
        cohortDefinition: {
          axes: [1, 2],
          guarded: false,
        },
      })
      expect(state.request.cohortDefinition.guarded).toBeFalsy()
      expect(state.request.cohortDefinition.axes[1]).toEqual(2)
    })
    it('PL_INIT_DATAMODEL', () => {
      patientList.mutations[types.PL_INIT_DATAMODEL](state, {
        resultDefinition: {
          selected_attributes: 123,
          sorted_attributes: '',
          sorting_directions: '',
        },
      })
      expect(state.dataModel.resultDefinition.selected_attributes).toEqual(123)
      expect(state.dataModel.currentPage).toEqual(state.dataModel.currentPage)
    })
  })
})
