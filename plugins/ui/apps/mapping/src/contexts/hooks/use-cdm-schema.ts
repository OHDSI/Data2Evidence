import { useCallback, useContext } from "react";
import { AppContext, AppDispatchContext } from "../AppContext";
import { ACTION_TYPES } from "../reducers/reducer";
import { TableSchemaState } from "../states";

export const useCdmSchema = () => {
  const { cdmVersion, cdmTables } = useContext(AppContext);
  const dispatch = useContext(AppDispatchContext);

  const setCdmVersion = useCallback((cdmVersion: string) => {
    dispatch({ type: ACTION_TYPES.SET_CDM_VERSION, payload: cdmVersion });
  }, []);

  const setCdmTables = useCallback((cdmTables: TableSchemaState[]) => {
    dispatch({ type: ACTION_TYPES.SET_CDM_TABLES, payload: cdmTables });
  }, []);

  return { setCdmVersion, setCdmTables, cdmVersion, cdmTables };
};
