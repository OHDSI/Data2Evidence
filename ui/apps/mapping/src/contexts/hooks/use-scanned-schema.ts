import { useCallback, useContext, useEffect, useState } from "react";
import { AppContext, AppDispatchContext } from "../AppContext";
import { ACTION_TYPES } from "../reducers/reducer";
import { ScannedSchemaState, TableSchemaState } from "../states";

export const useScannedSchema = () => {
  const { scannedSchema } = useContext(AppContext);
  const dispatch = useContext(AppDispatchContext);

  const [sourceTables, setSourceTables] = useState<TableSchemaState[]>([]);

  useEffect(() => {
    if (scannedSchema) {
      setSourceTables(scannedSchema.source_tables);
    }
  }, [scannedSchema?.source_tables]);

  const setScannedSchema = useCallback((scannedSchema: ScannedSchemaState) => {
    dispatch({ type: ACTION_TYPES.SET_SCANNED_SCHEMA, payload: scannedSchema });
  }, []);

  return { setScannedSchema, sourceTables };
};
