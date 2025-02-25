import React, { useCallback, useEffect, useState } from "react";
import Terminology, { TerminologyProps } from "./Terminology";
import { FhirValueSetExpansionContainsWithExt } from "./utils/types";
import { useUser } from "../../../contexts";

const eventListenerName = "alp-terminology-open";

export const TerminologyWithEventListener = () => {
  const [props, setProps] = useState<TerminologyProps | null>(null);
  const [open, setOpen] = useState(false);
  const { userId } = useUser();

  const listener = useCallback((e: Event) => {
    const customEvent = e as CustomEvent<{ props: TerminologyProps }>;
    const eventProps = customEvent.detail.props;
    setProps(eventProps);
    setOpen(true);
    return;
  }, []);

  useEffect(() => {
    // Ensure only one listener is created, and clean up if component is unmounted
    window.addEventListener(eventListenerName, listener);
    return () => {
      window.removeEventListener(eventListenerName, listener);
    };
  }, []);

  if (!userId || !props?.selectedDatasetId) {
    return null;
  }

  return (
    <Terminology
      onClose={(values) => {
        props?.onClose?.(values);
        setOpen(false);
        setProps(null);
        return;
      }}
      baseUserId={userId}
      open={open}
      initialInput={props?.initialInput}
      onConceptIdSelect={(value: FhirValueSetExpansionContainsWithExt) => {
        props?.onConceptIdSelect?.(value);
        setOpen(false);
        return;
      }}
      selectedConceptSetId={props?.selectedConceptSetId}
      mode={props?.mode}
      selectedDatasetId={props?.selectedDatasetId}
      defaultFilters={props?.defaultFilters}
    />
  );
};
