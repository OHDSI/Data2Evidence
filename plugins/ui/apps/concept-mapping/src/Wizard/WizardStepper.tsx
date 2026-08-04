import React, { FC, useContext } from "react";
import { IconButton } from "@mui/material";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
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
import "./WizardStepper.scss";

interface WizardStepperProps {
  sourceNode?: SourceNodeDTO;
  datasets: Study[];
  selectedDatasetId: string;
  onDisconnectSource?: () => void;
}

export const WizardStepper: FC<WizardStepperProps> = ({
  sourceNode,
  datasets,
  selectedDatasetId,
  onDisconnectSource,
}) => {
  const { getText } = useTranslation();
  const { setFeedback } = useFeedback();
  const state = useContext(ConceptMappingContext);
  const dispatch = useContext<React.Dispatch<DispatchType>>(ConceptMappingDispatchContext);
  const step = state.wizard.currentStep;

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

  // Leaving Step 1 for the first time locks the dataset selection in (see mappingStarted on
  // WizardState) - mapping work from here on depends on the chosen dataset staying fixed.
  const handleNext = () => {
    if (step === 0) {
      dispatch({ type: ACTION_TYPES.SET_MAPPING_STARTED, payload: true });
    }
    goTo(step + 1);
  };

  return (
    <div className="concept-mapping__wizard">
      {step > 0 && (
        <IconButton
          aria-label={getText(i18nKeys.WIZARD__BACK)}
          onClick={() => goTo(step - 1)}
          // Pin top-left; without alignSelf the flex column's stretch makes the button span
          // full width and its icon renders centered.
          sx={{ mb: 1, alignSelf: "flex-start" }}
        >
          <ArrowBackOutlinedIcon />
        </IconButton>
      )}

      <div className="concept-mapping__wizard-body">
        {step === 0 && (
          <Step1Source
            sourceNode={sourceNode}
            datasets={datasets}
            onResetDownstream={handleResetDownstream}
            onDisconnectSource={onDisconnectSource}
          />
        )}
        {step === 1 && <Step2ColumnMapping selectedDatasetId={selectedDatasetId} />}
        {step === 2 && <Step3ConceptMapping selectedDatasetId={selectedDatasetId} />}
      </div>

      <div className="concept-mapping__wizard-footer">
        {step < 2 && <Button text={getText(i18nKeys.WIZARD__NEXT)} disabled={!canNext} onClick={handleNext} />}
      </div>
    </div>
  );
};
