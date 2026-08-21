import { ConceptMappingState, csvDataType } from "../../types";
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
