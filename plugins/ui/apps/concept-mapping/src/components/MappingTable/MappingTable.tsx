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
import { parseToCsv, downloadFile, DownloadColumn } from "../../utils/Export";
import { ConceptMappingContext, ConceptMappingDispatchContext } from "../../Context/ConceptMappingContext";
import { DispatchType, ACTION_TYPES } from "../../Context/reducers";
import { i18nKeys } from "../../Context/state";
import { api } from "../../axios/api";
import "./MappingTable.scss";

interface MappingTableProps {
  selectedDatasetId: string;
  autoPopulate?: boolean;
  datasetName?: string;
}

export const MappingTable: FC<MappingTableProps> = ({ selectedDatasetId, autoPopulate, datasetName }) => {
  const { getText } = useTranslation();
  const conceptMappingState = useContext(ConceptMappingContext);
  const dispatch: React.Dispatch<DispatchType> = useContext(ConceptMappingDispatchContext);
  const { sourceCode, sourceName, sourceFrequency, description, domainId } = conceptMappingState.columnMapping;
  const csvData = conceptMappingState.csvData.data;
  const [isLoading, setIsLoading] = useState(false);

  const downloadColumns: DownloadColumn[] = [
    { header: getText(i18nKeys.OVERVIEW__SOURCE), accessor: sourceCode },
    { header: getText(i18nKeys.OVERVIEW__NAME), accessor: sourceName },
    { header: getText(i18nKeys.OVERVIEW__FREQUENCY), accessor: sourceFrequency },
    { header: getText(i18nKeys.OVERVIEW__DESCRIPTION), accessor: description },
    { header: getText(i18nKeys.OVERVIEW__CONCEPT_ID), accessor: "conceptId" },
    { header: getText(i18nKeys.OVERVIEW__CONCEPT_NAME), accessor: "conceptName" },
    { header: getText(i18nKeys.OVERVIEW__DOMAIN), accessor: "domainId" },
  ];

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
      return (
        <Box sx={{ display: "flex", gap: "2px" }}>
          {isApproved ? (
            <Tooltip title={getText(i18nKeys.ACTION__UNCHECK)}>
              <IconButton
                size="small"
                sx={{ color: "#000080" }}
                aria-label={getText(i18nKeys.ACTION__UNCHECK)}
                onClick={() => dispatch({ type: ACTION_TYPES.UNCHECK_ROW, payload: original })}
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
                  disabled={!original.conceptId}
                  onClick={() => dispatch({ type: ACTION_TYPES.APPROVE_ROW, payload: original })}
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
              onClick={() => dispatch({ type: ACTION_TYPES.TOGGLE_ROW_FLAG, payload: original })}
            >
              {original.flagged ? <FlagIcon fontSize="small" /> : <FlagOutlinedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      );
    },
    [dispatch, getText]
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
    data: csvData,
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

          <Button
            onClick={() =>
              downloadFile({
                data: parseToCsv(conceptMappingState.csvData.data, downloadColumns),
                fileName: "concept_mappings",
                fileType: "text/csv",
              })
            }
            text={getText(i18nKeys.OVERVIEW__DOWNLOAD_CSV)}
            variant="outlined"
          />
          <Button
            onClick={() => dispatch({ type: ACTION_TYPES.CLEAR_DATA })}
            text={getText(i18nKeys.OVERVIEW__CLEAR_AND_IMPORT)}
            variant="outlined"
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
