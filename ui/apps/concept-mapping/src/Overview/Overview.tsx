import React, { FC, useState, useContext, useCallback, useEffect } from "react";
import pako from "pako";
import { useDatasets, useDialogHelper, useFeedback } from "../hooks";
import { Snackbar, Button } from "@portal/components";
import { api } from "../axios/api";
import { CsvReader } from "../components/CsvReader/CsvReader";
import { ImportDialog } from "../components/ImportDialog/ImportDialog";
import { MappingTable } from "../components/MappingTable/MappingTable";
import { MappingDrawer } from "../components/MappingDrawer/MappingDrawer";
import { ConceptMappingContext, ConceptMappingDispatchContext } from "../Context/ConceptMappingContext";
import { FormControl, MenuItem, Select, SelectChangeEvent, Tabs, Tab } from "@mui/material";
import { useTranslation } from "../hooks/use-translation";
import { ConceptMappingState, csvData, Study } from "../types";
import { DispatchType, ACTION_TYPES } from "../Context/reducers";
import { i18nKeys } from "../Context/state";
import { SavedMappingsTable } from "../components/SavedMappingsTable/SavedMappingsTable";
import "./Overview.scss";

interface OverviewProps {
  locale?: string;
  data?: ConceptMappingState;
  onChange?: (data: Partial<ConceptMappingState>) => void;
}

export const Overview: FC<OverviewProps> = ({ locale = "en", data, onChange }) => {
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
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Study>();
  const selectedDatasetId = selectedDataset?.id;
  const [tabIndex, setTabIndex] = useState(0);
  const [showImportDialog, openImportDialog, closeImportDialog] = useDialogHelper(false);

  useEffect(() => {
    if (data) {
      dispatch({ type: ACTION_TYPES.SET_COLUMN_MAPPING, payload: data.columnMapping });
      dispatch({ type: ACTION_TYPES.SET_INITAL_DATA, payload: data.csvData });
    } else {
      dispatch({ type: ACTION_TYPES.SET_COLUMN_MAPPING, payload: {} });
      dispatch({ type: ACTION_TYPES.CLEAR_DATA });
    }
  }, [data]);

  useEffect(() => {
    const { columnMapping, csvData } = conceptMappingState;
    typeof onChange === "function" &&
      onChange({
        columnMapping,
        csvData,
        databaseCode: selectedDataset?.databaseCode,
        schemaName: selectedDataset?.schemaName,
        sourceVocabularyId: csvData.name,
      });
  }, [onChange, conceptMappingState, selectedDataset]);

  const handleCloseImportDialog = useCallback(() => {
    closeImportDialog();
  }, [closeImportDialog]);

  const handleOnFileLoaded = useCallback(
    (data: csvData) => {
      dispatch({ type: ACTION_TYPES.SET_IMPORT_DATA, payload: data });
      openImportDialog();
    },
    [dispatch, openImportDialog]
  );

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

      const mappings = csvData.data
        .filter((d) => d.status === "checked")
        .map((row) => ({
          source_code: row[sourceCode] ?? "",
          source_concept_id: 0,
          source_code_description: row[sourceName] ?? "",
          target_concept_id: row.conceptId ?? 0,
          target_vocabulary_id: row.system ?? "",
          valid_start_date: toISODate(row.validStartDate),
          valid_end_date: toISODate(row.validEndDate),
          invalid_reason: row.validity ?? "",
        }));

      const encoded = window.btoa(pako.deflate(JSON.stringify(mappings), { to: "string" }));
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

  useEffect(() => {
    if (!datasets || selectedDataset) return;
    if (datasets?.[0]) {
      setSelectedDataset(datasets[0]);
    }
  }, [datasets, selectedDataset]);

  if (!selectedDatasetId) {
    return null;
  }

  return (
    <div className="concept-mapping__overview">
      <Snackbar
        type={feedback?.type}
        handleClose={clearFeedback}
        message={feedback?.message}
        description={feedback?.description}
        visible={feedback?.message != null}
      />
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ marginRight: "10px" }}>{getText(i18nKeys.OVERVIEW__REFERENCE_CONCEPTS)}: </div>
        <FormControl sx={{ marginRight: "20px" }}>
          <Select
            value={selectedDatasetId ?? ""}
            onChange={(e: SelectChangeEvent) => {
              const dataset = datasets?.find((d) => d.id === e.target.value);
              if (dataset) setSelectedDataset(dataset);
            }}
            sx={{ "& .MuiSelect-outlined": { paddingTop: "8px", paddingBottom: "8px" } }}
          >
            {datasets?.map((dataset) => (
              <MenuItem value={dataset.id} key={dataset.id} sx={{}} disableRipple>
                {dataset.studyDetail?.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          text={getText(i18nKeys.OVERVIEW__SAVE_TO_DATABASE)}
          onClick={handleSave}
          loading={isSaving}
          disabled={
            !selectedDataset?.databaseCode ||
            !selectedDataset?.schemaName ||
            conceptMappingState.csvData.data.length === 0
          }
        />
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mt: 2, mb: 1 }}>
          <Tab label={getText(i18nKeys.OVERVIEW__MAPPING_TAB)} />
          <Tab label={getText(i18nKeys.OVERVIEW__SAVED_MAPPINGS_TAB)} />
        </Tabs>
      </div>

      {tabIndex === 0 && (
        <div>
          {conceptMappingState.importData.data.length !== 0 && (
            <ImportDialog
              open={showImportDialog}
              onClose={handleCloseImportDialog}
              loading={loading}
              setLoading={setLoading}
              selectedDatasetId={selectedDatasetId}
            />
          )}
          {conceptMappingState.csvData.data.length == 0 && (
            <CsvReader onFileLoaded={handleOnFileLoaded} parseOptions={{ header: true }}></CsvReader>
          )}
          <br></br>
          {conceptMappingState.csvData.data.length !== 0 && <MappingTable selectedDatasetId={selectedDatasetId} />}
          <MappingDrawer selectedDatasetId={selectedDatasetId} />
        </div>
      )}

      {tabIndex === 1 && selectedDataset?.databaseCode && selectedDataset?.schemaName && (
        <SavedMappingsTable databaseCode={selectedDataset.databaseCode} schemaName={selectedDataset.schemaName} />
      )}
    </div>
  );
};
