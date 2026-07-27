import React, { FC, useContext, useState } from "react";
import { Step, StepLabel, Stepper } from "@mui/material";
import { Button, Dialog } from "@portal/components";
import { ConceptMappingContext, ConceptMappingDispatchContext } from "../Context/ConceptMappingContext";
import { DispatchType, ACTION_TYPES } from "../Context/reducers";
import { useTranslation } from "../hooks";
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
  const state = useContext(ConceptMappingContext);
  const dispatch = useContext<React.Dispatch<DispatchType>>(ConceptMappingDispatchContext);
  const step = state.wizard.currentStep;
  const [pendingReset, setPendingReset] = useState<null | (() => void)>(null);

  const stepLabels = [
    getText(i18nKeys.WIZARD__STEP1_TITLE),
    getText(i18nKeys.WIZARD__STEP2_TITLE),
    getText(i18nKeys.WIZARD__STEP3_TITLE),
  ];

  // Only prompt+reset once the user has done downstream work worth protecting.
  const requestReset = () => {
    const hasDownstream = !!state.columnMapping.sourceCode || state.csvData.data.length > 0;
    if (hasDownstream) {
      setPendingReset(() => () => dispatch({ type: ACTION_TYPES.RESET_DOWNSTREAM }));
    } else {
      dispatch({ type: ACTION_TYPES.RESET_DOWNSTREAM });
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

      {step === 0 && <Step1Source sourceNode={sourceNode} datasets={datasets} onResetDownstream={requestReset} />}
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

      {pendingReset && (
        <Dialog open title={getText(i18nKeys.WIZARD__RESET_CONFIRM_TITLE)} closable onClose={() => setPendingReset(null)}>
          <div style={{ padding: 16 }}>{getText(i18nKeys.WIZARD__RESET_CONFIRM_MESSAGE)}</div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: 16 }}>
            <Button
              text={getText(i18nKeys.IMPORT_DIALOG__CANCEL)}
              variant="outlined"
              onClick={() => setPendingReset(null)}
            />
            <Button
              text={getText(i18nKeys.WIZARD__NEXT)}
              onClick={() => {
                pendingReset();
                setPendingReset(null);
              }}
            />
          </div>
        </Dialog>
      )}
    </div>
  );
};
