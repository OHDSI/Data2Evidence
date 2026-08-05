import React, { FC, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MaterialReactTable, MRT_ColumnDef, MRT_RowData, useMaterialReactTable } from "material-react-table";
import { Box, Button, Chip } from "@portal/components";
import { IconButton, Tooltip } from "@mui/material";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import BackspaceOutlinedIcon from "@mui/icons-material/BackspaceOutlined";
import TungstenOutlinedIcon from "@mui/icons-material/TungstenOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import FlagIcon from "@mui/icons-material/Flag";
import { useTranslation } from "../../hooks";
import { RowObject, MappingStatus } from "../../types";
import { ConceptMappingContext, ConceptMappingDispatchContext } from "../../Context/ConceptMappingContext";
import { DispatchType, ACTION_TYPES } from "../../Context/reducers";
import { i18nKeys } from "../../Context/state";
import { api } from "../../axios/api";
import { ConceptInput, NodeSuggestionsRow, SuggestionDto } from "../../axios/concept-mapping-suggestions";
import { deriveRowStatus } from "../../utils/deriveRowStatus";
import "./MappingTable.scss";

interface MappingTableProps {
  selectedDatasetId: string;
  autoPopulate?: boolean;
  datasetName?: string;
  // Scopes the backend suggestions this table loads/writes; absent when the node hasn't
  // been persisted yet, in which case the table falls back to purely client-side behavior.
  dataflowId?: string;
  nodeId?: string;
  // Bumped by a sibling (MappingDrawer, after it persists a new suggestion) to make this
  // table refetch even though its own dataflowId/nodeId props haven't changed.
  refreshSignal?: number;
  // Mirrors the freshly-loaded suggestions map up to an ancestor (e.g. StepFlow, which needs
  // it to decide whether the CSV download button should be enabled) without that ancestor
  // having to duplicate the fetch.
  onSuggestionsChange?: (suggestionsByRowId: Record<string, NodeSuggestionsRow>) => void;
}

export const MappingTable: FC<MappingTableProps> = ({
  selectedDatasetId,
  autoPopulate,
  datasetName,
  dataflowId,
  nodeId,
  refreshSignal,
  onSuggestionsChange,
}) => {
  const { getText } = useTranslation();
  const conceptMappingState = useContext(ConceptMappingContext);
  const dispatch: React.Dispatch<DispatchType> = useContext(ConceptMappingDispatchContext);
  const { sourceCode, sourceName, sourceFrequency, description, domainId } = conceptMappingState.columnMapping;
  const csvData = conceptMappingState.csvData.data;
  const [isLoading, setIsLoading] = useState(false);

  // Multi-user suggestions loaded from the backend, keyed by sourceRowId. This - not the
  // local reducer's `status`/`flagged` fields - is now the source of truth for the Status
  // chip and Flag icon (see deriveRowStatus below); the reducer fields still exist on
  // mappingData but are effectively stale once a dataflowId/nodeId are wired up.
  const [suggestionsByRowId, setSuggestionsByRowId] = useState<Record<string, NodeSuggestionsRow>>({});

  const loadSuggestions = useCallback(async () => {
    if (!dataflowId || !nodeId) {
      return;
    }
    const rows = await api.conceptMappingSuggestions.getSuggestions(dataflowId, nodeId);
    const map: Record<string, NodeSuggestionsRow> = {};
    rows.forEach((row) => {
      map[row.sourceRowId] = row;
    });
    setSuggestionsByRowId(map);
  }, [dataflowId, nodeId]);

  useEffect(() => {
    loadSuggestions();
    // refreshSignal is a pure trigger (its value is never read) - bumping it is how a
    // sibling component asks this table to refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadSuggestions, refreshSignal]);

  useEffect(() => {
    onSuggestionsChange?.(suggestionsByRowId);
  }, [suggestionsByRowId, onSuggestionsChange]);

  // Rows as rendered/acted on: csvData merged with the backend suggestions for that row's
  // sourceRowId. Concept columns (conceptId/conceptName/...) still come from csvData
  // (Recommend fills them client-side) - only status/flagged/suggestion-id resolution come
  // from the backend merge.
  const mergedData = useMemo(
    () =>
      csvData.map((row) => {
        const backendRow = row.sourceRowId ? suggestionsByRowId[row.sourceRowId] : undefined;
        const derived = deriveRowStatus({ flagged: backendRow?.flagged, suggestions: backendRow?.suggestions });
        return {
          ...row,
          status: derived.status,
          flagged: derived.flagged,
          _suggestions: backendRow?.suggestions ?? [],
        };
      }),
    [csvData, suggestionsByRowId]
  );

  const handleApprove = useCallback(
    async (row: { [key: string]: any }) => {
      if (!dataflowId || !nodeId || !row.sourceRowId) {
        return;
      }
      let suggestionId: string | undefined = row._suggestions?.[0]?.id;
      if (!suggestionId) {
        // No backend suggestion yet - this is a Recommend-filled, client-only concept.
        // Persist it first, then approve the suggestion just created.
        const concept: ConceptInput = {
          conceptId: row.conceptId,
          conceptName: row.conceptName,
          conceptCode: row.conceptCode,
          domainId: row.domainId,
          vocabularyId: row.vocabularyId,
        };
        const dto = await api.conceptMappingSuggestions.addSuggestion(dataflowId, nodeId, row.sourceRowId, concept);
        suggestionId = dto.id;
      }
      await api.conceptMappingSuggestions.approve(suggestionId);
      await loadSuggestions();
    },
    [dataflowId, nodeId, loadSuggestions]
  );

  const handleUncheck = useCallback(
    async (row: { [key: string]: any }) => {
      const suggestionId: string | undefined = row._suggestions?.find((s: SuggestionDto) => s.isApproved)?.id;
      if (!suggestionId) {
        return;
      }
      await api.conceptMappingSuggestions.unapprove(suggestionId);
      await loadSuggestions();
    },
    [loadSuggestions]
  );

  const handleFlag = useCallback(
    async (row: { [key: string]: any }) => {
      if (!dataflowId || !nodeId || !row.sourceRowId) {
        return;
      }
      await api.conceptMappingSuggestions.setRowFlag(dataflowId, nodeId, row.sourceRowId, !row.flagged);
      await loadSuggestions();
    },
    [dataflowId, nodeId, loadSuggestions]
  );

  // Status is displayed as a chip (unchecked/suggested/approved) plus an optional flag
  // indicator. Colors/icons are intentionally simple - no external design tokens exist for
  // this yet in the plugin.
  const statusChipConfig: Record<MappingStatus, { label: string; color: "default" | "info" | "success" }> = {
    unchecked: { label: getText(i18nKeys.STATUS__UNCHECKED), color: "default" },
    suggested: { label: getText(i18nKeys.STATUS__SUGGESTED), color: "info" },
    approved: { label: getText(i18nKeys.STATUS__APPROVED), color: "success" },
  };

  const renderStatusCell = useCallback(
    (original: { [key: string]: any }) => {
      const status: MappingStatus = original.status ?? "unchecked";
      const config = statusChipConfig[status] ?? statusChipConfig.unchecked;
      // Flagged state is shown only by the Flag action button (filled orange), not by a
      // separate indicator in front of the row.
      return (
        <Chip
          size="small"
          label={config.label}
          color={config.color}
          icon={status === "approved" ? <TaskAltIcon fontSize="small" /> : undefined}
        />
      );
    },
    [getText, statusChipConfig]
  );

  const renderActionsCell = useCallback(
    (original: { [key: string]: any }) => {
      const isApproved = original.status === "approved";
      // Enabled once there's *something* to approve: a concept filled in client-side by
      // Recommend, or a suggestion already persisted on the backend (e.g. via Suggest).
      const canApprove = !!original.conceptId || (original._suggestions?.length ?? 0) > 0;
      return (
        <Box sx={{ display: "flex", gap: "2px" }}>
          {isApproved ? (
            <Tooltip title={getText(i18nKeys.ACTION__UNCHECK)}>
              <IconButton
                size="small"
                sx={{ color: "#000080" }}
                aria-label={getText(i18nKeys.ACTION__UNCHECK)}
                onClick={() => handleUncheck(original)}
              >
                <BackspaceOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            // span wrapper so the tooltip still shows when the button is disabled (no concept)
            <Tooltip title={getText(i18nKeys.ACTION__APPROVE)}>
              <span>
                <IconButton
                  size="small"
                  sx={{ color: "#000080" }}
                  aria-label={getText(i18nKeys.ACTION__APPROVE)}
                  disabled={!canApprove}
                  onClick={() => handleApprove(original)}
                >
                  <TaskAltIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
          <Tooltip title={getText(i18nKeys.ACTION__SUGGEST)}>
            <IconButton
              size="small"
              sx={{ color: "#000080" }}
              aria-label={getText(i18nKeys.ACTION__SUGGEST)}
              onClick={() => dispatch({ type: ACTION_TYPES.SET_SELECTED_DATA, payload: original })}
            >
              <TungstenOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {/* Flag button carries the flagged state: navy when off, filled orange when on. */}
          <Tooltip title={getText(i18nKeys.ACTION__FLAG)}>
            <IconButton
              size="small"
              sx={{ color: original.flagged ? "#ed6c02" : "#000080" }}
              aria-label={getText(i18nKeys.ACTION__FLAG)}
              onClick={() => handleFlag(original)}
            >
              {original.flagged ? <FlagIcon fontSize="small" /> : <FlagOutlinedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      );
    },
    [dispatch, getText, handleApprove, handleUncheck, handleFlag]
  );

  const columns = useMemo<MRT_ColumnDef<{ [key: string]: any }>[]>(
    () => [
      {
        id: "0",
        accessorKey: "status",
        header: getText(i18nKeys.MAPPING_TABLE__STATUS),
        size: 150,
        Cell: ({ row }) => renderStatusCell(row.original),
      },
      {
        id: "1",
        accessorKey: sourceCode,
        header: getText(i18nKeys.MAPPING_TABLE__SOURCE),
        size: 150,
      },
      {
        id: "2",
        accessorKey: sourceName,
        header: getText(i18nKeys.MAPPING_TABLE__NAME), // source name
        size: 150,
      },
      {
        id: "3",
        accessorKey: sourceFrequency,
        header: getText(i18nKeys.MAPPING_TABLE__FREQUENCY),
        size: 150,
      },
      {
        id: "4",
        accessorKey: description,
        header: getText(i18nKeys.MAPPING_TABLE__DESCRIPTION),
        size: 150,
      },
      {
        id: "5",
        accessorKey: "conceptId",
        header: getText(i18nKeys.MAPPING_TABLE__CONCEPT_ID),
        size: 150,
      },
      {
        id: "6",
        accessorKey: "conceptName",
        header: getText(i18nKeys.MAPPING_TABLE__CONCEPT_NAME),
        size: 150,
      },
      {
        id: "7",
        accessorKey: "conceptCode",
        header: getText(i18nKeys.MAPPING_TABLE__CONCEPT_CODE),
        size: 150,
      },
      {
        id: "8",
        accessorKey: "domainId",
        header: getText(i18nKeys.MAPPING_TABLE__DOMAIN_ID),
        size: 150,
      },
      {
        id: "9",
        accessorKey: "vocabularyId",
        header: getText(i18nKeys.MAPPING_TABLE__VOCABULARY),
        size: 150,
      },
      {
        id: "actions",
        header: "",
        size: 130,
        enableResizing: false,
        enableColumnActions: false,
        enableSorting: false,
        Cell: ({ row }) => renderActionsCell(row.original),
      },
    ],
    [sourceCode, sourceName, sourceFrequency, description, getText, renderStatusCell, renderActionsCell]
  );

  // Whole-row click used to open the terminology search drawer; that's now an explicit
  // "Suggest" action icon instead (see renderActionsCell), so this only supplies the
  // alternating-row / selected-row styling.
  const TableBodyRowProps = ({ row }: { row: MRT_RowData }) => ({
    sx: {
      "&:nth-of-type(even)": {
        backgroundColor: "#fafafa",
        "&.MuiTableRow-root:hover": {
          backgroundColor: "#ebf1f8",
        },
      },
      backgroundColor: row.index % 2 === 0 ? "#f5f5f5" : "#ffffff",
      boxShadow: row.original == conceptMappingState.selectedData ? "inset 0px 0px 0px 2px #3b438c" : "none",
    },
  });

  const tableInstance = useMaterialReactTable({
    initialState: { density: "compact", columnPinning: { right: ["actions"] } },
    enableDensityToggle: false,
    columns,
    data: mergedData,
    enableColumnResizing: true,
    layoutMode: "grid",
    muiTableHeadCellProps: {
      style: {
        fontWeight: "bold",
        fontSize: "16px",
      },
    },
    muiTableBodyCellProps: {
      style: {
        fontSize: "14px",
        color: "#000080",
      },
    },
    muiTableBodyRowProps: TableBodyRowProps,
    muiTableHeadRowProps: {
      style: {
        backgroundColor: "#ebf1f8",
      },
    },
    muiTopToolbarProps: {
      style: {
        backgroundColor: "#fbfbfd",
      },
    },
    renderTopToolbarCustomActions: () => (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", p: "4px" }}>
        <Box sx={{ fontWeight: 500 }}>
          {getText(i18nKeys.MAPPING_TABLE__DATASET_REFERENCE)}
          {datasetName ? `: ${datasetName}` : ""}
        </Box>
        <Box sx={{ display: "flex", gap: "1rem" }}>
          <Button
            onClick={() => recommendConcepts()}
            text={getText(i18nKeys.MAPPING_TABLE__RECOMMEND_CONCEPT)}
            loading={isLoading}
            disabled={getAvailableRows().length === 0}
          />
        </Box>
      </Box>
    ),
  });

  // Recommend targets rows that don't have a concept assigned yet - unlike the old
  // "checked" flag, status alone no longer tells us whether a row needs a concept
  // (e.g. an unchecked row that already got a concept from a previous Recommend run
  // shouldn't be re-fetched).
  const getAvailableRows = useCallback(() => {
    return tableInstance.getCenterRows().filter((row: MRT_RowData) => !row.original.conceptId);
  }, [tableInstance]);

  const recommendConcepts = useCallback(async () => {
    const formattedRows = getAvailableRows().map((row: MRT_RowData) => {
      const formattedRow: RowObject = { index: row.index, searchText: row.original[sourceName] };
      if (domainId) {
        formattedRow["domainId"] = row.original[domainId];
      }
      return formattedRow;
    });

    setIsLoading(true);
    const result = await api.terminology.getStandardConcepts(formattedRows, selectedDatasetId!);

    dispatch({ type: ACTION_TYPES.SET_MULTIPLE_MAPPING, payload: result });
    setIsLoading(false);
  }, [dispatch, domainId, getAvailableRows, selectedDatasetId, sourceName]);

  const didAutoPopulate = React.useRef(false);
  useEffect(() => {
    if (autoPopulate && !didAutoPopulate.current && getAvailableRows().length > 0) {
      didAutoPopulate.current = true;
      recommendConcepts();
    }
  }, [autoPopulate, getAvailableRows, recommendConcepts]);

  return <MaterialReactTable table={tableInstance} />;
};
