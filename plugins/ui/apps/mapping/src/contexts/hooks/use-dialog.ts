import { useCallback, useContext } from "react";
import { AppContext, AppDispatchContext } from "../AppContext";
import { ACTION_TYPES } from "../reducers/reducer";

export const useDialog = () => {
  const dispatch = useContext(AppDispatchContext);
  const { dialog } = useContext(AppContext);

  const openSaveMappingDialog = useCallback((visible: boolean) => {
    dispatch({ type: ACTION_TYPES.OPEN_SAVE_MAPPING_DIALOG, payload: visible });
  }, []);

  const openLoadMappingDialog = useCallback((visible: boolean) => {
    dispatch({ type: ACTION_TYPES.OPEN_LOAD_MAPPING_DIALOG, payload: visible });
  }, []);

  return { openSaveMappingDialog, openLoadMappingDialog, ...dialog };
};
