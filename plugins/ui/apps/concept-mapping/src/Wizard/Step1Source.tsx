import React, { FC, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Box, FormControl, MenuItem, Select, SelectChangeEvent, TextField, Typography } from "@mui/material";
import { Checkbox } from "@portal/components";
import { ConceptMappingContext, ConceptMappingDispatchContext } from "../Context/ConceptMappingContext";
import { DispatchType, ACTION_TYPES } from "../Context/reducers";
import { useTranslation } from "../hooks";
import { i18nKeys } from "../Context/state";
import { CsvReader } from "../components/CsvReader/CsvReader";
import { buildCsvSourceData, buildNodeSourceData, extractColumns } from "../source/source-adapter";
import { SourceData, SourceNodeDTO } from "../types/source";
import { Study, csvData } from "../types";

interface Step1SourceProps {
  sourceNode?: SourceNodeDTO;
  datasets: Study[];
  onResetDownstream: () => void;
}

// Structural equality for the subset of SourceData that a connected node can produce
// (columns + nodeMeta). Used to detect a genuine source change vs. a no-op remount
// (e.g. reopening the drawer for a node that was already connected last session).
function isSameNodeSourceData(current: SourceData | null, intended: SourceData): boolean {
  if (!current || current.type !== intended.type) return false;
  if (current.columns.length !== intended.columns.length) return false;
  if (current.columns.some((c, i) => c !== intended.columns[i])) return false;
  const a = current.nodeMeta;
  const b = intended.nodeMeta;
  if (!a || !b) return a === b;
  return a.name === b.name && a.type === b.type && a.description === b.description;
}

export const Step1Source: FC<Step1SourceProps> = ({ sourceNode, datasets, onResetDownstream }) => {
  const { getText } = useTranslation();
  const state = useContext(ConceptMappingContext);
  const dispatch = useContext<React.Dispatch<DispatchType>>(ConceptMappingDispatchContext);
  const nodeColumns = useMemo(() => (sourceNode ? extractColumns(sourceNode) : null), [sourceNode]);
  const [manualColumns, setManualColumns] = useState("");
  // Tracks the previously-seen connected node's identity (across renders, not across
  // remounts) so a genuine reconnect - to a *different* node - can be told apart from
  // this same node re-rendering, and so stale manually-typed columns from a prior node
  // are never carried over onto a new one (fix for task-7 review finding 2).
  const prevNodeKeyRef = useRef<string | null>(null);

  // Node source: (re)build SourceData only when the connected node's derived SourceData
  // actually differs from what's already in context. Guarding on "did the intended value
  // change" - rather than firing unconditionally on every mount/re-render while a node is
  // connected - is what stops re-opening the drawer for an already-connected node from
  // wiping out downstream column-mapping/concept work (fix for task-7 review finding 1).
  // NOTE: state.wizard.sourceData / dispatch / onResetDownstream are deliberately excluded
  // from the dependency array below (see task-7 report) to avoid re-running this effect -
  // and re-clearing downstream state - on every render triggered by the dispatch itself.
  useEffect(() => {
    if (!sourceNode) {
      prevNodeKeyRef.current = null;
      return;
    }

    const nodeKey = `${sourceNode.type}::${sourceNode.name}`;
    const isNewNode = prevNodeKeyRef.current !== nodeKey;
    prevNodeKeyRef.current = nodeKey;

    // Manually-typed columns belong to whichever node was connected when they were typed;
    // never reuse them for a different node's SourceData computation.
    const effectiveManualColumns = isNewNode ? "" : manualColumns;
    if (isNewNode && manualColumns !== "") {
      setManualColumns("");
    }

    const intended: SourceData =
      nodeColumns && nodeColumns.length > 0
        ? buildNodeSourceData(sourceNode)
        : {
            type: "node",
            columns: effectiveManualColumns
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean),
            nodeMeta: { name: sourceNode.name, type: sourceNode.type, description: sourceNode.description },
          };

    if (isSameNodeSourceData(state.wizard.sourceData, intended)) {
      return;
    }

    onResetDownstream();
    dispatch({ type: ACTION_TYPES.SET_SOURCE_DATA, payload: intended });
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
