import { useCallback, useContext } from "react";
import { AppContext, AppDispatchContext } from "../AppContext";
import { ACTION_TYPES } from "../reducer";

export const useDisclaimer = () => {
  const { disclaimer } = useContext(AppContext);
  const dispatch = useContext(AppDispatchContext);

  const setIsDisclaimerAccepted = useCallback(
    (accepted: boolean) => {
      dispatch({ type: ACTION_TYPES.SET_DISCLAIMER_ACCEPTED, payload: accepted });
    },
    [dispatch]
  );

  const setShouldDisplayDisclaimer = useCallback(
    (display: boolean) => {
      dispatch({ type: ACTION_TYPES.SET_SHOULD_DISPLAY_DISCLAIMER, payload: display });
    },
    [dispatch]
  );

  const clearDisclaimer = useCallback(() => {
    dispatch({ type: ACTION_TYPES.CLEAR_DISCLAIMER });
  }, [dispatch]);
  return { disclaimer, setIsDisclaimerAccepted, setShouldDisplayDisclaimer, clearDisclaimer };
};
