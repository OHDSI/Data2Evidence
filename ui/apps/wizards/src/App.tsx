import { PortalProps } from "./types/portal";
import { useWizardContext } from "./context/WizardContext";

export default function App(props: PortalProps) {
  const {
    currentStep,
    selectedWizardId,
    formData,
    navigationHistory,
    goForward,
    goBack,
    selectWizard,
    updateFormData,
    resetWizard,
  } = useWizardContext();

  return (
    <div style={{ padding: "20px" }}>
      <h1>Wizards App</h1>
      <p>Wizard functionality coming soon...</p>
      {props.datasetId && <p>Dataset: {props.datasetId}</p>}
      {props.username && <p>User: {props.username}</p>}

      <div style={{ marginTop: "20px", border: "1px solid #ccc", padding: "10px" }}>
        <h2>Context State (Debug)</h2>
        <p>Current Step: {currentStep} of 4</p>
        <p>Selected Wizard: {selectedWizardId || "None"}</p>
        <p>Form Data: {JSON.stringify(formData)}</p>
        <p>Navigation History: {JSON.stringify(navigationHistory)}</p>

        <div style={{ marginTop: "10px" }}>
          <h3>Test Actions</h3>
          <button onClick={() => goBack()} disabled={currentStep === 1}>
            Go Back
          </button>
          <button onClick={() => goForward()} disabled={currentStep === 4}>
            Go Forward
          </button>
          <button onClick={() => selectWizard("test-wizard")}>Select Test Wizard</button>
          <button onClick={() => updateFormData({ age: 25, name: "Test" })}>Update Form Data</button>
          <button onClick={() => resetWizard()}>Reset Wizard</button>
        </div>
      </div>
    </div>
  );
}
