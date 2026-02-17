import { useState, useEffect, useMemo } from "react";
import { PortalProps } from "./types/portal";
import { WizardProvider } from "./context/WizardContext";
import { WizardShell } from "./components/WizardShell";
import { WizardConfigEditor } from "./components/WizardConfigEditor";
import { useWizardContext } from "./context/WizardContext";

declare global {
  interface Window {
    openWizardConfigEditor?: () => void;
  }
}

function AppContent() {
  const [editorOpen, setEditorOpen] = useState(false);
  const { portalProps } = useWizardContext();

  useEffect(() => {
    window.openWizardConfigEditor = () => {
      setEditorOpen(true);
    };

    return () => {
      delete window.openWizardConfigEditor;
    };
  }, []);

  return (
    <>
      <WizardShell />
      <WizardConfigEditor isOpen={editorOpen} onClose={() => setEditorOpen(false)} datasetId={portalProps.datasetId} />
    </>
  );
}

export default function App(props: PortalProps) {
  const [customProps, setCustomProps] = useState<Partial<PortalProps>>({});

  useEffect(() => {
    const handlePropsChange = (event: Event) => {
      const { appId, ...newProps } = (event as CustomEvent).detail || {};
      if (appId === props.appId) {
        setCustomProps(newProps);
      }
    };

    window.addEventListener("custom-props-changed", handlePropsChange);
    return () => {
      window.removeEventListener("custom-props-changed", handlePropsChange);
    };
  }, [props.appId]);

  const mergedProps = useMemo(() => ({ ...props, ...customProps }), [props, customProps]);

  return (
    <WizardProvider portalProps={mergedProps}>
      <AppContent />
    </WizardProvider>
  );
}
