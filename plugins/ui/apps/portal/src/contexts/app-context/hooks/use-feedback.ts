import { useCallback, useContext } from "react";
import { Feedback } from "../../../types";
import { AppContext, AppDispatchContext } from "../..";
import { ACTION_TYPES } from "../reducer";

export const useFeedback = (): {
  setFeedback: (feedback: Feedback) => void;
  clearFeedback: () => void;
  getFeedback: () => Feedback | undefined;
  setGenericErrorFeedback: () => void;
} => {
  const { feedback } = useContext(AppContext);
  const dispatch = useContext(AppDispatchContext);

  const setFeedback = useCallback((feedback: Feedback) => {
    dispatch({ type: ACTION_TYPES.SET_FEEDBACK, payload: feedback });
  }, []);

  const clearFeedback = useCallback(() => {
    dispatch({ type: ACTION_TYPES.CLEAR_FEEDBACK });
  }, []);

  const getFeedback = useCallback(() => {
    return feedback;
  }, [feedback]);

  const setGenericErrorFeedback = useCallback(() => {
    setFeedback({
      type: "error",
      message: "An error has occurred.",
      description: "Please try again. To report the error, please send an email to help@data4life.care.",
    });
  }, [setFeedback]);

  return { setFeedback, clearFeedback, getFeedback, setGenericErrorFeedback };
};
