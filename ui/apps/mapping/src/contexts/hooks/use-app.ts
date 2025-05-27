import { useCallback, useContext } from "react";
import { AppContext, AppDispatchContext } from "../AppContext";
import { ACTION_TYPES } from "../reducers/reducer";
import { AppState } from "../states";
import { Page } from "../../constants";

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

  const setMappingSuggestion = useCallback((data: boolean) => {
    dispatch({ type: ACTION_TYPES.SET_MAPPING_SUGGESTION, payload: data });
  }, []);

  const setPage = useCallback((page: Page) => {
    dispatch({ type: ACTION_TYPES.SET_PAGE, payload: page });
  }, []);

  return {
    reset,
    load,
    clearHandles,
    markAsSaved,
    setVocabularyDatasetId,
    setMappingSuggestion,
    setPage,
    state,
  };
};
