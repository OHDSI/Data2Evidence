import React, { FC, useState, useContext, useCallback, useEffect } from "react";
import pako from "pako";
import { useDatasets, useFeedback } from "../hooks";
import { Snackbar, Button } from "@portal/components";
import { api } from "../axios/api";
import { ConceptMappingContext, ConceptMappingDispatchContext } from "../Context/ConceptMappingContext";
import { Tabs, Tab } from "@mui/material";
import { useTranslation } from "../hooks/use-translation";
import { ConceptMappingState } from "../types";
import { SourceNodeDTO } from "../types/source";
import { DispatchType, ACTION_TYPES } from "../Context/reducers";
import { i18nKeys } from "../Context/state";
import { SavedMappingsTable } from "../components/SavedMappingsTable/SavedMappingsTable";
import { WizardStepper } from "../Wizard/WizardStepper";
import "./Overview.scss";

interface OverviewProps {
  locale?: string;
  data?: ConceptMappingState;
  onChange?: (data: Partial<ConceptMappingState>) => void;
  sourceNode?: SourceNodeDTO;
  onDisconnectSource?: () => void;
}

export const Overview: FC<OverviewProps> = ({ locale = "en", data, onChange, sourceNode, onDisconnectSource }) => {
  const { getText, changeLocale } = useTranslation();
  const dispatch: React.Dispatch<DispatchType> = useContext(ConceptMappingDispatchContext);
  const conceptMappingState = useContext(ConceptMappingContext);
  const [datasets] = useDatasets();
  const { setFeedback, clearFeedback, getFeedback } = useFeedback();
  const feedback = getFeedback();

  useEffect(() => {
    if (locale) {
      changeLocale(locale);
    }
  }, [locale]);

  useEffect(() => {
    if ((feedback?.autoClose || 0) > 0) setTimeout(() => clearFeedback(), feedback?.autoClose);
  }, [feedback, clearFeedback]);

  // local states
  const [isSaving, setIsSaving] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  // Single source of truth for the reference dataset: the Step 1 selection
  // (wizard.datasetId). The Overview header no longer carries its own dataset dropdown -
  // both Step 3's concept lookup and the Save button derive from this.
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

  const mappings = conceptMappingState.csvData.data.filter((d) => d.status === "checked");

  const handleSave = useCallback(async () => {
    const databaseCode = selectedDataset?.databaseCode;
    const schemaName = selectedDataset?.schemaName;
    const csvData = conceptMappingState.csvData;

    if (!databaseCode || !schemaName || !csvData?.data?.length) return;

    setIsSaving(true);
    try {
      const { sourceCode, sourceName } = conceptMappingState.columnMapping;
      const toISODate = (val: unknown): string => {
        if (!val) return "";
        const d = val instanceof Date ? val : new Date(String(val));
        if (isNaN(d.getTime())) return "";
        return d.toISOString().slice(0, 10);
      };

      const parsedMappings = mappings.map((row) => ({
        source_code: row[sourceCode] ?? "",
        source_concept_id: 0,
        source_code_description: row[sourceName] ?? "",
        target_concept_id: row.conceptId ?? 0,
        target_vocabulary_id: row.system ?? "",
        valid_start_date: toISODate(row.validStartDate),
        valid_end_date: toISODate(row.validEndDate),
        invalid_reason: row.validity ?? "",
      }));

      const encoded = window.btoa(pako.deflate(JSON.stringify(parsedMappings), { to: "string" }));
      await api.conceptMapping.saveConceptMappings(databaseCode, schemaName, csvData.name || "", encoded);
      setFeedback({
        type: "success",
        message: `Saved to ${databaseCode}`,
        autoClose: 3000,
      });
    } catch {
      setFeedback({
        type: "error",
        message: "Failed to save concept mappings",
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedDataset, conceptMappingState.csvData, conceptMappingState.columnMapping, setFeedback]);

  return (
    <div className="concept-mapping__overview">
      <Snackbar
        type={feedback?.type}
        handleClose={clearFeedback}
        message={feedback?.message}
        description={feedback?.description}
        visible={feedback?.message != null}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <Button
          text={getText(i18nKeys.OVERVIEW__SAVE_TO_DATABASE)}
          onClick={handleSave}
          loading={isSaving}
          disabled={
            !selectedDataset?.databaseCode ||
            !selectedDataset?.schemaName ||
            conceptMappingState.csvData.data.length === 0 ||
            mappings.length === 0
          }
        />
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mt: 2, mb: 1 }}>
          <Tab label={getText(i18nKeys.WIZARD__CONFIGURATION_TAB)} />
          <Tab label={getText(i18nKeys.OVERVIEW__SAVED_MAPPINGS_TAB)} />
        </Tabs>
      </div>

      {tabIndex === 0 && (
        <WizardStepper
          sourceNode={sourceNode}
          datasets={datasets ?? []}
          selectedDatasetId={selectedDatasetId ?? ""}
          onDisconnectSource={onDisconnectSource}
        />
      )}

      {tabIndex === 1 && selectedDataset?.databaseCode && selectedDataset?.schemaName && (
        <SavedMappingsTable databaseCode={selectedDataset.databaseCode} schemaName={selectedDataset.schemaName} />
      )}
    </div>
  );
};
