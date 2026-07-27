import React, { FC, useContext } from "react";
import { Step, StepLabel, Stepper } from "@mui/material";
import { Button } from "@portal/components";
import { ConceptMappingContext, ConceptMappingDispatchContext } from "../Context/ConceptMappingContext";
import { DispatchType, ACTION_TYPES } from "../Context/reducers";
import { useTranslation, useFeedback } from "../hooks";
import { i18nKeys } from "../Context/state";
import { Study } from "../types";
import { SourceNodeDTO } from "../types/source";
import { Step1Source } from "./Step1Source";
import { Step2ColumnMapping } from "./Step2ColumnMapping";
import { Step3ConceptMapping } from "./Step3ConceptMapping";
import { canProceedStep1, canProceedStep2 } from "./gating";

interface WizardStepperProps {
  sourceNode?: SourceNodeDTO;
  datasets: Study[];
  selectedDatasetId: string;
}

export const WizardStepper: FC<WizardStepperProps> = ({ sourceNode, datasets, selectedDatasetId }) => {
  const { getText } = useTranslation();
  const { setFeedback } = useFeedback();
  const state = useContext(ConceptMappingContext);
  const dispatch = useContext<React.Dispatch<DispatchType>>(ConceptMappingDispatchContext);
  const step = state.wizard.currentStep;

  const stepLabels = [
    getText(i18nKeys.WIZARD__STEP1_TITLE),
    getText(i18nKeys.WIZARD__STEP2_TITLE),
    getText(i18nKeys.WIZARD__STEP3_TITLE),
  ];

  // Reset atomically with the source/dataset change (no cancelable confirm - a
  // confirm dialog would leave the new source paired with the old, now-stale
  // downstream state if the user dismissed it). When there was downstream work
  // worth clearing, surface a brief non-blocking notice via the feedback Snackbar;
  // stay silent on a no-op population (e.g. first mount) to avoid a spurious toast.
  const handleResetDownstream = () => {
    const hasDownstream = !!state.columnMapping.sourceCode || state.csvData.data.length > 0;
    dispatch({ type: ACTION_TYPES.RESET_DOWNSTREAM });
    if (hasDownstream) {
      setFeedback({
        type: "success",
        message: getText(i18nKeys.WIZARD__RESET_CONFIRM_MESSAGE),
        autoClose: 4000,
      });
    }
  };

  const canNext = step === 0 ? canProceedStep1(state) : step === 1 ? canProceedStep2(state) : false;
  const goTo = (n: number) => dispatch({ type: ACTION_TYPES.SET_WIZARD_STEP, payload: n });

  return (
    <div className="concept-mapping__wizard">
      <Stepper activeStep={step} sx={{ mb: 3 }}>
        {stepLabels.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {step === 0 && (
        <Step1Source sourceNode={sourceNode} datasets={datasets} onResetDownstream={handleResetDownstream} />
      )}
      {step === 1 && <Step2ColumnMapping />}
      {step === 2 && <Step3ConceptMapping selectedDatasetId={selectedDatasetId} />}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
        <Button
          text={getText(i18nKeys.WIZARD__BACK)}
          variant="outlined"
          disabled={step === 0}
          onClick={() => goTo(step - 1)}
        />
        {step < 2 && (
          <Button text={getText(i18nKeys.WIZARD__NEXT)} disabled={!canNext} onClick={() => goTo(step + 1)} />
        )}
      </div>
    </div>
  );
};
