import { useState, useEffect } from "react";
import { PortalProps } from "./types/portal";
import { WizardShell } from "./components/WizardShell";
import { WizardConfigEditor } from "./components/WizardConfigEditor";
import { useWizardContext } from "./context/WizardContext";

declare global {
  interface Window {
    openWizardConfigEditor?: () => void;
  }
}

export default function App(_props: PortalProps) {
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
