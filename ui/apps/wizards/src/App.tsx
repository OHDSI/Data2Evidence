import { PortalProps } from "./types/portal";
import { useWizardContext } from "./context/WizardContext";
import { Step1Selection } from "./components/Step1Selection";
import { Step2Introduction } from "./components/Step2Introduction";
import { Step3Form } from "./components/Step3Form";
import { Step4Results } from "./components/Step4Results";

export default function App(_props: PortalProps) {
  const { currentStep } = useWizardContext();

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Selection />;
      case 2:
        return <Step2Introduction />;
      case 3:
        return <Step3Form />;
      case 4:
        return <Step4Results />;
      default:
        return null;
    }
  };

  return <div>{renderStep()}</div>;
}
