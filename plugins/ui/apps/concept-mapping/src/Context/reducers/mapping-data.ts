import { ConceptMappingState, csvDataType, conceptData, mappingData } from "../../types";
import { StandardConcepts } from "../../types";

export const setInitialData = (state: ConceptMappingState, payload: csvDataType): ConceptMappingState => {
  return { ...state, csvData: payload };
};

export const clearData = (state: ConceptMappingState): ConceptMappingState => ({
  ...state,
  csvData: {
    name: "",
    columns: [],
    data: [],
  },
});

export const setSingleMapping = (state: ConceptMappingState, payload: conceptData): ConceptMappingState => {
  const index = state.csvData.data.findIndex((data) => data === state.selectedData);
  return {
    ...state,
    csvData: {
      ...state.csvData,
      data: [
        ...state.csvData.data.slice(0, index),
        {
          ...state.csvData.data[index],
          conceptId: payload.conceptId,
          conceptName: payload.conceptName,
          domainId: payload.domainId,
          system: payload.system,
          validStartDate: payload.validStartDate,
          validEndDate: payload.validEndDate,
          validity: payload.validity,
          status: "suggested",
        },
        ...state.csvData.data.slice(index + 1),
      ],
    },
  };
};

export const setMultipleMapping = (state: ConceptMappingState, payload: StandardConcepts[]): ConceptMappingState => {
  return {
    ...state,
    csvData: {
      ...state.csvData,
      data: state.csvData.data.map((row, index) => {
        const updatedRow = payload.find((item) => item.index === index);
        if (updatedRow) {
          const { index: _, ...rest } = updatedRow;
          return { ...row, ...rest, status: "unchecked" };
        }
        return row;
      }),
    },
  };
};

export const setSelectedData = (state: ConceptMappingState, payload: any): ConceptMappingState => ({
  ...state,
  selectedData: payload,
});

export const clearSelectedData = (state: ConceptMappingState): ConceptMappingState => ({
  ...state,
  selectedData: {},
});

// Rows are matched by object reference (like selectedData) rather than an id/index, so these
// stay robust to sorting/filtering in the table. All three are no-ops when the row reference
// isn't found in csvData.data (e.g. stale reference after data was reset).
const updateRowByRef = (
  state: ConceptMappingState,
  rowRef: mappingData,
  updater: (row: mappingData) => mappingData
): ConceptMappingState => {
  const index = state.csvData.data.findIndex((d) => d === rowRef);
  if (index === -1) return state;
  return {
    ...state,
    csvData: {
      ...state.csvData,
      data: [
        ...state.csvData.data.slice(0, index),
        updater(state.csvData.data[index]),
        ...state.csvData.data.slice(index + 1),
      ],
    },
  };
};

export const approveRow = (state: ConceptMappingState, rowRef: mappingData): ConceptMappingState =>
  updateRowByRef(state, rowRef, (row) => ({ ...row, status: "approved" }));

export const uncheckRow = (state: ConceptMappingState, rowRef: mappingData): ConceptMappingState =>
  updateRowByRef(state, rowRef, (row) => ({ ...row, status: "unchecked" }));

export const toggleRowFlag = (state: ConceptMappingState, rowRef: mappingData): ConceptMappingState =>
  updateRowByRef(state, rowRef, (row) => ({ ...row, flagged: !row.flagged }));
