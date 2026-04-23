import React, { createContext, FC, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslation, i18nKeys } from "./TranslationContext";

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

const AUTO_CLOSE_SUCCESS_MS = 5000;

export const FeedbackProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { getText } = useTranslation();
  const [feedback, setFeedbackState] = useState<Feedback>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFeedback = useCallback(() => {
    setFeedbackState({});
  }, []);

  const setFeedback = useCallback((feedback: Feedback) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setFeedbackState(feedback);
    const delay = feedback.autoClose ?? (feedback.type === "success" ? AUTO_CLOSE_SUCCESS_MS : undefined);
    if (delay !== undefined) {
      timerRef.current = setTimeout(() => {
        setFeedbackState({});
        timerRef.current = null;
      }, delay);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const getFeedback = useCallback(() => {
    return feedback;
  }, [feedback]);

  const setGenericErrorFeedback = useCallback(() => {
    setFeedback({
      type: "error",
      message: getText(i18nKeys.GENERAL__ERROR_OCCURRED),
      description: getText(i18nKeys.GENERAL__ERROR_CONTACT_SUPPORT),
    });
  }, [setFeedback, getText]);

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
