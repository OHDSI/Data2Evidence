import React, { useCallback, useEffect, useState } from "react";
import ResultsDialog, { ResultsDialogProps } from "./ResultsDialog";

const eventListenerName = "alp-results-dialog-open";

export const ResultsDialogWithEventLister = () => {
  const [props, setProps] = useState<ResultsDialogProps | null>(null);
  const [open, setOpen] = useState(false);

  const listener = useCallback((e: Event) => {
    const customEvent = e as CustomEvent<{ props: ResultsDialogProps }>;
    const eventProps = customEvent.detail.props;
    setProps(eventProps);
    setOpen(true);
    return;
  }, []);

  useEffect(() => {
    window.addEventListener(eventListenerName, listener);
    return () => {
      window.removeEventListener(eventListenerName, listener);
    };
  }, []);

  return (
    <ResultsDialog
      open={open}
      job={props?.job!}
      onClose={() => {
        setOpen(false);
        setProps(null);
        return;
      }}
    />
  );
};
