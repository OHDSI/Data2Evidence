import React, { FC, useContext, useEffect, useMemo, useState } from "react";
import { Box, FormControl, MenuItem, Select, SelectChangeEvent, TextField, Typography } from "@mui/material";
import { Checkbox } from "@portal/components";
import { ConceptMappingContext, ConceptMappingDispatchContext } from "../Context/ConceptMappingContext";
import { DispatchType, ACTION_TYPES } from "../Context/reducers";
import { useTranslation } from "../hooks";
import { i18nKeys } from "../Context/state";
import { CsvReader } from "../components/CsvReader/CsvReader";
import { buildCsvSourceData, buildNodeSourceData, extractColumns } from "../source/source-adapter";
import { SourceNodeDTO } from "../types/source";
import { Study, csvData } from "../types";

interface Step1SourceProps {
  sourceNode?: SourceNodeDTO;
  datasets: Study[];
  onResetDownstream: () => void;
}

export const Step1Source: FC<Step1SourceProps> = ({ sourceNode, datasets, onResetDownstream }) => {
  const { getText } = useTranslation();
  const state = useContext(ConceptMappingContext);
  const dispatch = useContext<React.Dispatch<DispatchType>>(ConceptMappingDispatchContext);
  const nodeColumns = useMemo(() => (sourceNode ? extractColumns(sourceNode) : null), [sourceNode]);
  const [manualColumns, setManualColumns] = useState("");

  // Node source: (re)build SourceData whenever the connected node (or manual columns) changes.
  // NOTE: onResetDownstream/dispatch are stable identities from context/props in practice, but they
  // are deliberately excluded from the dependency array below (see task-7 report) to avoid re-running
  // this effect - and re-clearing downstream state - on every render when callers pass inline functions.
  useEffect(() => {
    if (!sourceNode) return;
    onResetDownstream();
    if (nodeColumns && nodeColumns.length > 0) {
      dispatch({ type: ACTION_TYPES.SET_SOURCE_DATA, payload: buildNodeSourceData(sourceNode) });
    } else {
      const cols = manualColumns
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      dispatch({
        type: ACTION_TYPES.SET_SOURCE_DATA,
        payload: {
          type: "node",
          columns: cols,
          nodeMeta: { name: sourceNode.name, type: sourceNode.type, description: sourceNode.description },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceNode, nodeColumns, manualColumns]);

  const handleCsvLoaded = (loaded: csvData) => {
    onResetDownstream();
    const columns = loaded.data.meta.fields ?? [];
    dispatch({ type: ACTION_TYPES.SET_SOURCE_DATA, payload: buildCsvSourceData(loaded.name, columns, loaded.data.data) });
  };

  const handleDataset = (e: SelectChangeEvent) => {
    onResetDownstream();
    dispatch({ type: ACTION_TYPES.SET_DATASET_ID, payload: e.target.value });
  };

  return (
    <div className="concept-mapping__step1">
      <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
        {getText(i18nKeys.STEP1__CONNECTED_SOURCE)}
      </Typography>

      {sourceNode ? (
        <Box sx={{ p: 2, border: "1px solid #dad7d7", borderRadius: 1, mb: 2 }}>
          <Typography sx={{ fontWeight: 600 }}>{sourceNode.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {sourceNode.type}
          </Typography>
          <Typography variant="body2">{sourceNode.description}</Typography>
          <Typography variant="caption" color="text.secondary">
            {getText(i18nKeys.STEP1__CONNECTED_NODE_HINT)}
          </Typography>
          {(!nodeColumns || nodeColumns.length === 0) && (
            <TextField
              // `variant="standard"` avoids MUI's outlined-variant behavior of rendering the
              // label a second time inside a <legend> (for the notched-border effect), which
              // would otherwise make this label text match twice.
              variant="standard"
              fullWidth
              size="small"
              sx={{ mt: 1 }}
              label={getText(i18nKeys.STEP1__MANUAL_COLUMNS_LABEL)}
              value={manualColumns}
              onChange={(e) => setManualColumns(e.target.value)}
            />
          )}
        </Box>
      ) : (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ mb: 1 }}>{getText(i18nKeys.STEP1__CONNECT_NODE_OPTION)}</Typography>
          <Typography sx={{ mb: 1 }}>{getText(i18nKeys.STEP1__UPLOAD_CSV_OPTION)}</Typography>
          <CsvReader onFileLoaded={handleCsvLoaded} parseOptions={{ header: true }} />
          {state.wizard.sourceData?.type === "csv" && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              ✓ {state.wizard.sourceData.columns.length} columns
            </Typography>
          )}
        </Box>
      )}

      <FormControl sx={{ minWidth: 260, mb: 2 }}>
        <Typography sx={{ mb: 0.5 }}>{getText(i18nKeys.OVERVIEW__REFERENCE_CONCEPTS)}</Typography>
        <Select value={state.wizard.datasetId ?? ""} onChange={handleDataset}>
          {datasets.map((d) => (
            <MenuItem value={d.id} key={d.id}>
              {d.studyDetail?.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Checkbox
        checked={state.wizard.loadRecommendationByDefault}
        label={getText(i18nKeys.STEP1__LOAD_RECOMMENDATION)}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          dispatch({ type: ACTION_TYPES.SET_LOAD_RECOMMENDATION, payload: e.target.checked })
        }
      />
    </div>
  );
};
