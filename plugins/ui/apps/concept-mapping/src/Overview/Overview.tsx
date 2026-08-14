import React, { FC, useContext, useEffect } from "react";
import { useDatasets, useFeedback } from "../hooks";
import { Snackbar } from "@portal/components";
import { ConceptMappingContext, ConceptMappingDispatchContext } from "../Context/ConceptMappingContext";
import { useTranslation } from "../hooks/use-translation";
import { ConceptMappingState } from "../types";
import { SourceNodeDTO } from "../types/source";
import { DispatchType, ACTION_TYPES } from "../Context/reducers";
import { StepFlow } from "../Steps/StepFlow";
import "./Overview.scss";

interface OverviewProps {
  locale?: string;
  data?: ConceptMappingState;
  onChange?: (data: Partial<ConceptMappingState>) => void;
  sourceNode?: SourceNodeDTO;
  onDisconnectSource?: () => void;
  onSaveAndClose?: () => void;
  dataflowId?: string;
  nodeId?: string;
}

export const Overview: FC<OverviewProps> = ({
  locale = "en",
  data,
  onChange,
  sourceNode,
  onDisconnectSource,
  onSaveAndClose,
  dataflowId,
  nodeId,
}) => {
  const { changeLocale } = useTranslation();
  const dispatch: React.Dispatch<DispatchType> = useContext(ConceptMappingDispatchContext);
  const conceptMappingState = useContext(ConceptMappingContext);
  const [datasets] = useDatasets();
  const { clearFeedback, getFeedback } = useFeedback();
  const feedback = getFeedback();

  useEffect(() => {
    if (locale) {
      changeLocale(locale);
    }
  }, [locale]);

  useEffect(() => {
    if ((feedback?.autoClose || 0) > 0) setTimeout(() => clearFeedback(), feedback?.autoClose);
  }, [feedback, clearFeedback]);

  // Single source of truth for the reference dataset: the Step 1 selection (wizard.datasetId).
  // Step 3's concept lookup derives from this; the persisted payload carries its db/schema.
  const selectedDataset = datasets?.find((d) => d.id === conceptMappingState.wizard.datasetId);
  const selectedDatasetId = selectedDataset?.id;

  useEffect(() => {
    if (data) {
      dispatch({ type: ACTION_TYPES.SET_COLUMN_MAPPING, payload: data.columnMapping });
      dispatch({ type: ACTION_TYPES.SET_INITAL_DATA, payload: data.csvData });
      // Rehydrate the wizard slice too, so a reopened config restores its source, dataset
      // and load-recommendation choice (without this, a CSV-sourced config lands stuck on
      // Step 1 with no sourceData/datasetId). SET_SOURCE_DATA also re-derives sourceType.
      if (data.wizard) {
        dispatch({ type: ACTION_TYPES.SET_SOURCE_DATA, payload: data.wizard.sourceData });
        dispatch({ type: ACTION_TYPES.SET_DATASET_ID, payload: data.wizard.datasetId });
        dispatch({ type: ACTION_TYPES.SET_LOAD_RECOMMENDATION, payload: data.wizard.loadRecommendationByDefault });
        // Resume where the user left off: restore the current step and the mapping-started
        // lock (the latter keeps the reference-dataset selector disabled once mapping began).
        // Without these, a reopened config always lands on Step 1 with the dataset unlocked.
        dispatch({ type: ACTION_TYPES.SET_WIZARD_STEP, payload: data.wizard.currentStep });
        dispatch({ type: ACTION_TYPES.SET_MAPPING_STARTED, payload: data.wizard.mappingStarted });
      }
    } else {
      dispatch({ type: ACTION_TYPES.SET_COLUMN_MAPPING, payload: {} });
      dispatch({ type: ACTION_TYPES.CLEAR_DATA });
    }
  }, [data]);

  useEffect(() => {
    const { columnMapping, csvData, wizard } = conceptMappingState;
    typeof onChange === "function" &&
      onChange({
        columnMapping,
        csvData,
        databaseCode: selectedDataset?.databaseCode,
        schemaName: selectedDataset?.schemaName,
        sourceVocabularyId: csvData.name,
        wizard,
      });
  }, [onChange, conceptMappingState, selectedDataset]);

  return (
    <div className="concept-mapping__overview">
      <Snackbar
        type={feedback?.type}
        handleClose={clearFeedback}
        message={feedback?.message}
        description={feedback?.description}
        visible={feedback?.message != null}
      />
      <StepFlow
        sourceNode={sourceNode}
        datasets={datasets ?? []}
        selectedDatasetId={selectedDatasetId ?? ""}
        datasetName={selectedDataset?.studyDetail?.name}
        onDisconnectSource={onDisconnectSource}
        onSaveAndClose={onSaveAndClose}
        dataflowId={dataflowId}
        nodeId={nodeId}
      />
    </div>
  );
};
