import React, { FC, useCallback, useContext, useMemo, useState } from "react";
import { MaterialReactTable, MRT_ColumnDef, MRT_RowData, useMaterialReactTable } from "material-react-table";
import { Box, Button } from "@portal/components";
import { useTranslation } from "../../hooks";
import { RowObject } from "../../types";
import { parseToCsv, downloadFile, DownloadColumn } from "../../utils/Export";
import { ConceptMappingContext, ConceptMappingDispatchContext } from "../../Context/ConceptMappingContext";
import { DispatchType, ACTION_TYPES } from "../../Context/reducers";
import { i18nKeys } from "../../Context/state";
import { api } from "../../axios/api";
import "./MappingTable.scss";

interface MappingTableProps {
  selectedDatasetId: string;
}

export const MappingTable: FC<MappingTableProps> = ({ selectedDatasetId }) => {
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

  const columns = useMemo<MRT_ColumnDef<{ [key: string]: any }>[]>(
    () => [
      {
        id: "0",
        accessorKey: "status",
        header: getText(i18nKeys.MAPPING_TABLE__STATUS),
        size: 150,
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
        accessorKey: "domainId",
        header: getText(i18nKeys.MAPPING_TABLE__DOMAIN_ID),
        size: 150,
      },
      {
        id: "8",
        accessorKey: "system",
        header: getText(i18nKeys.MAPPING_TABLE__VOCABULARY),
        size: 150,
      },
    ],
    [sourceCode, sourceName, sourceFrequency, description, getText]
  );

  const TableBodyRowProps = ({ row }: { row: MRT_RowData }) => ({
    onClick: () => {
      dispatch({ type: ACTION_TYPES.SET_SELECTED_DATA, payload: row.original });
    },
    sx: {
      cursor: "pointer",
      "&:nth-of-type(even)": {
        backgroundColor: "#fafafa",
        "&.MuiTableRow-root:hover": {
          backgroundColor: "#ebf1f8",
          boxShadow: "inset 0px 0px 0px 2px #3b438c",
        },
      },
      backgroundColor: row.index % 2 === 0 ? "#f5f5f5" : "#ffffff",
      boxShadow: row.original == conceptMappingState.selectedData ? "inset 0px 0px 0px 2px #3b438c" : "none",
    },
  });

  const tableInstance = useMaterialReactTable({
    initialState: { density: "compact" },
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
      <Box sx={{ display: "flex", gap: "1rem", p: "4px" }}>
        <Button
          onClick={() => populateConcepts()}
          text={getText(i18nKeys.MAPPING_TABLE__POPULATE_CONCEPTS)}
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
    ),
  });

  const getAvailableRows = useCallback(() => {
    return tableInstance.getCenterRows().filter((row: MRT_RowData) => row.original.status !== "checked");
  }, [tableInstance]);

  const populateConcepts = useCallback(async () => {
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

  return <MaterialReactTable table={tableInstance} />;
};
