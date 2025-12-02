import React, { createContext, FC, ReactNode, useCallback, useContext, useState } from "react";

export interface Feedback {
  type?: "error" | "success";
  message?: string | string[];
  description?: string;
  autoClose?: number;
}

interface FeedbackContextValue {
  setFeedback: (feedback: Feedback) => void;
  clearFeedback: () => void;
  getFeedback: () => Feedback;
  setGenericErrorFeedback: () => void;
}

const FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined);

export const FeedbackProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [feedback, setFeedbackState] = useState<Feedback>({});

  const setFeedback = useCallback((feedback: Feedback) => {
    setFeedbackState(feedback);
  }, []);

  const clearFeedback = useCallback(() => {
    setFeedbackState({});
  }, []);

  const getFeedback = useCallback(() => {
    return feedback;
  }, [feedback]);

  const setGenericErrorFeedback = useCallback(() => {
    setFeedback({
      type: "error",
      message: "An error has occurred.",
      description: "Please try again. To report the error, please contact support.",
    });
  }, [setFeedback]);

  return (
    <FeedbackContext.Provider value={{ setFeedback, clearFeedback, getFeedback, setGenericErrorFeedback }}>
      {children}
    </FeedbackContext.Provider>
  );
};

export const useFeedback = (): FeedbackContextValue => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error("useFeedback must be used within a FeedbackProvider");
  }
  return context;
};
