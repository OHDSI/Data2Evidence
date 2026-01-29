import { PortalProps } from "./types/portal";
import { useWizardContext } from "./context/WizardContext";
import { Step1Selection } from "./components/Step1Selection";

export default function App(_props: PortalProps) {
  const { currentStep } = useWizardContext();

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Selection />;
      case 2:
        return (
          <div style={{ padding: "20px" }}>
            <h2>Step 2: Introduction</h2>
            <p>Coming soon...</p>
          </div>
        );
      case 3:
        return (
          <div style={{ padding: "20px" }}>
            <h2>Step 3: Form Entry</h2>
            <p>Coming soon...</p>
          </div>
        );
      case 4:
        return (
          <div style={{ padding: "20px" }}>
            <h2>Step 4: Results</h2>
            <p>Coming soon...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return <div>{renderStep()}</div>;
}
