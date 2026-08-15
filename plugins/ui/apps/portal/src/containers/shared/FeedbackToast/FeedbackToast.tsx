import React, { FC, useEffect } from "react";
import { Snackbar, Alert } from "@portal/components";
import { useFeedback } from "../../../contexts";

// Renders the app's global feedback. Existing callers render the legacy Snackbar
// unchanged; callers that opt in with `variant: "alert"` get the new Alert toast.
export const FeedbackToast: FC = () => {
  const { getFeedback, clearFeedback } = useFeedback();
  const feedback = getFeedback();

  // Legacy auto-close (Snackbar path). The Alert path auto-dismisses on its own.
  useEffect(() => {
    if (feedback?.variant !== "alert" && (feedback?.autoClose || 0) > 0) {
      const timer = setTimeout(() => clearFeedback(), feedback?.autoClose);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [feedback, clearFeedback]);

  if (feedback?.variant === "alert") {
    return (
      <Alert
        variant="toast"
        severity={feedback.type ?? "info"}
        title={feedback.title}
        message={feedback.message}
        actionLabel={feedback.actionLabel}
        onAction={feedback.onAction}
        dismissible={!feedback.autoClose}
        autoHideDuration={feedback.autoClose}
        visible={feedback.message != null}
        onClose={clearFeedback}
      />
    );
  }

  return (
    <Snackbar
      type={feedback?.type}
      handleClose={clearFeedback}
      message={feedback?.message}
      description={feedback?.description}
      visible={feedback?.message != null}
    />
  );
};
