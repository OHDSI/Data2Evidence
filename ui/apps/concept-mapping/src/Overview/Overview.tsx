import React, { FC, useState, useContext, useCallback, useEffect } from "react";
import { useDatasets, useDialogHelper, useFeedback } from "../hooks";
import { Snackbar } from "@portal/components";
import { CsvReader } from "../components/CsvReader/CsvReader";
import { ImportDialog } from "../components/ImportDialog/ImportDialog";
import { MappingTable } from "../components/MappingTable/MappingTable";
import { MappingDrawer } from "../components/MappingDrawer/MappingDrawer";
import { ConceptMappingContext, ConceptMappingDispatchContext } from "../Context/ConceptMappingContext";
import { FormControl, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { useTranslation } from "../hooks/use-translation";
import { ConceptMappingState, csvData } from "../types";
import { DispatchType, ACTION_TYPES } from "../Context/reducers";
import { i18nKeys } from "../Context/state";
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

  // local states
  const [loading, setLoading] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>();
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
    typeof onChange === "function" && onChange({ columnMapping, csvData });
  }, [onChange, conceptMappingState]);

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

  useEffect(() => {
    if (!datasets || selectedDatasetId) return;
    if (datasets?.[0]?.id) {
      setSelectedDatasetId(datasets[0].id);
    }
  }, [datasets, selectedDatasetId]);

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
            value={selectedDatasetId}
            onChange={(e: SelectChangeEvent) => {
              setSelectedDatasetId(e.target.value);
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
      </div>

      <div className="testing">
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
      </div>
    </div>
  );
};
