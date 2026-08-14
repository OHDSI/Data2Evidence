import React, { createContext, Dispatch, FC } from "react";
import { AppState, initialState } from "./states";
import { DispatchType, reducer } from "./reducers/reducer";
import { usePersistedReducer } from "./persisted-reducer";
import { mappingStorageKey } from "./storage-key";

export const AppContext = createContext<AppState>(initialState);
export const AppDispatchContext = createContext<Dispatch<DispatchType>>(() => undefined);

const whitelist: (keyof AppState)[] = ["datasetSelected", "table", "field", "scannedSchema", "cdmVersion", "cdmTables"];

interface AppProviderProps {
  nodeId?: string;
  children?: React.ReactNode;
}

export const AppProvider: FC<AppProviderProps> = ({ nodeId, children }) => {
  const { state, dispatch } = usePersistedReducer(reducer, initialState, mappingStorageKey(nodeId), whitelist);

  return (
    <AppContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>{children}</AppDispatchContext.Provider>
    </AppContext.Provider>
  );
};
