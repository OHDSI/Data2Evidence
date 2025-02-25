import { useCallback, useContext } from "react";
import { AppContext, AppDispatchContext } from "../AppContext";
import { ACTION_TYPES } from "../reducers/reducer";
import { AppState } from "../states";

export const useApp = () => {
  const dispatch = useContext(AppDispatchContext);
  const state = useContext(AppContext);

  const reset = useCallback(() => {
    dispatch({ type: ACTION_TYPES.RESET });
  }, []);

  const load = useCallback((data: Partial<AppState>) => {
    dispatch({ type: ACTION_TYPES.LOAD, payload: data });
  }, []);

  const clearHandles = useCallback(() => {
    dispatch({ type: ACTION_TYPES.CLEAR_HANDLES });
  }, []);

  const markAsSaved = useCallback(() => {
    dispatch({ type: ACTION_TYPES.MARK_AS_SAVED });
  }, []);

  const setVocabularyDatasetId = useCallback((data: Partial<AppState>) => {
    dispatch({ type: ACTION_TYPES.SET_VOCABULARY_DATASET_ID, payload: data });
  }, []);

  return { reset, load, clearHandles, markAsSaved, setVocabularyDatasetId, state };
};
