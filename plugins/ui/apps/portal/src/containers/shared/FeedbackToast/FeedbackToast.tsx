import React, { FC, useEffect } from "react";
import { Snackbar, Alert } from "@portal/components";
import { useFeedback } from "../../../contexts";
import "./FeedbackToast.scss";

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
    const alertProps = {
      severity: feedback.type ?? "info",
      title: feedback.title,
      actionLabel: feedback.actionLabel,
      onAction: feedback.onAction,
      dismissible: !feedback.autoClose,
      autoHideDuration: feedback.autoClose,
      onClose: clearFeedback,
    } as const;
    const message = feedback.messageNode ?? feedback.message;
    const visible = message != null;
    if (feedback.stackedMessageNode == null) {
      return <Alert variant="toast" {...alertProps} message={message} visible={visible} />;
    }
    // One fixed container; the two alerts inside are laid out in a column, share one close and one timer.
    return (
      <div className="feedback-toast-stack">
        <Alert variant="toast" {...alertProps} message={message} visible={visible} />
        <Alert variant="toast" {...alertProps} message={feedback.stackedMessageNode} visible={visible} />
      </div>
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
