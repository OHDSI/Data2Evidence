import React, { createContext, FC, ReactNode, useContext } from "react";
import { ToastContainer, toast, ToastOptions } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export interface FeedbackMessage {
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
}

interface FeedbackContextValue {
  setFeedback: (feedback: FeedbackMessage) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined);

export const FeedbackProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const setFeedback = (feedback: FeedbackMessage) => {
    const options: ToastOptions = {
      position: "top-right",
      autoClose: feedback.duration || 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    };

    switch (feedback.type) {
      case "success":
        toast.success(feedback.message, options);
        break;
      case "error":
        toast.error(feedback.message, options);
        break;
      case "info":
        toast.info(feedback.message, options);
        break;
      case "warning":
        toast.warning(feedback.message, options);
        break;
      default:
        toast(feedback.message, options);
    }
  };

  return (
    <FeedbackContext.Provider value={{ setFeedback }}>
      {children}
      <ToastContainer />
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
