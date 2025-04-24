import React, { FC, createContext, useReducer, Dispatch } from "react";
import { ConceptMappingProviderProps, ConceptMappingState } from "../types";
import { reducer, DispatchType } from "./reducers/reducer";

const initialState: ConceptMappingState = {
  importData: {
    name: "",
    columns: [],
    data: [],
  },
  csvData: {
    name: "",
    columns: [],
    data: [],
  },
  selectedData: {},
  columnMapping: {
    sourceCode: "",
    sourceName: "",
    sourceFrequency: "",
    description: "",
  },
  filters: {},
};

export const ConceptMappingContext = createContext<ConceptMappingState>(initialState);
export const ConceptMappingDispatchContext = createContext<Dispatch<DispatchType>>(() => undefined);

export const ConceptMappingProvider: FC<ConceptMappingProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <ConceptMappingContext.Provider value={state}>
      <ConceptMappingDispatchContext.Provider value={dispatch}>{children}</ConceptMappingDispatchContext.Provider>
    </ConceptMappingContext.Provider>
  );
};
