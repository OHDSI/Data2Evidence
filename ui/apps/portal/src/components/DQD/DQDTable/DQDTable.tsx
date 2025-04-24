import React, { FC, useMemo } from "react";
import { MaterialReactTable, MRT_ColumnDef, MRT_Row } from "material-react-table";
import { Box, Typography, Card } from "@mui/material";
import { CheckResults } from "../types";
import "./DQDTable.scss";
import SearchIcon from "@mui/icons-material/Search";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import KeyboardDoubleArrowDownIcon from "@mui/icons-material/KeyboardDoubleArrowDown";
import FilterListIcon from "@mui/icons-material/FilterList";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";
import SortIcon from "@mui/icons-material/Sort";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useTranslation } from "../../../contexts";

interface DQDTableProps {
  data: CheckResults[];
}

const DQDTable: FC<DQDTableProps> = ({ data }) => {
  const { getText, i18nKeys } = useTranslation();
  const filterUniqueValues = (data: CheckResults[], key: keyof CheckResults) => {
    const uniqueValues = [...new Set(data.map((item) => item[key]))];
    const uniqueFilterOptions = uniqueValues.map((elem) => ({ text: String(elem), value: elem }));
    return uniqueFilterOptions;
  };

  // Maps 0 to No and 1 to Yes
  const mapIntToString = (value: number) => {
    return value ? getText(i18nKeys.DQD_TABLE__YES) : getText(i18nKeys.DQD_TABLE__NO);
  };

  // column properties
  const columns = useMemo<MRT_ColumnDef<CheckResults>[]>(
    () => [
      {
        accessorKey: "failed",
        header: getText(i18nKeys.DQD_TABLE__COLUMN_STATUS_HEADER),
        size: 150,
        filterFn: "equals",
        filterSelectOptions: filterUniqueValues(data, "failed"),
        filterVariant: "select",
      },
      {
        accessorKey: "context",
        header: getText(i18nKeys.DQD_TABLE__COLUMN_CONTEXT_HEADER),
        size: 180,
        filterFn: "equals",
        filterSelectOptions: filterUniqueValues(data, "context"),
        filterVariant: "select",
      },
      {
        accessorKey: "cdmTableName",
        header: getText(i18nKeys.DQD_TABLE__COLUMN_TABLE_HEADER),
        size: 150,
        filterFn: "equals",
        filterSelectOptions: filterUniqueValues(data, "cdmTableName"),
        filterVariant: "select",
      },
      {
        accessorKey: "category",
        header: getText(i18nKeys.DQD_TABLE__COLUMN_CATEGORY_HEADER),
        size: 180,
        filterFn: "equals",
        filterSelectOptions: filterUniqueValues(data, "category"),
        filterVariant: "select",
      },
      {
        accessorKey: "subcategory",
        header: getText(i18nKeys.DQD_TABLE__COLUMN_SUBCATEGORY_HEADER),
        size: 200,
        filterFn: "equals",
        filterSelectOptions: filterUniqueValues(data, "subcategory"),
        filterVariant: "select",
      },
      {
        accessorKey: "checkLevel",
        header: getText(i18nKeys.DQD_TABLE__COLUMN_LEVEL_HEADER),
        filterFn: "equals",
        filterSelectOptions: filterUniqueValues(data, "checkLevel"),
        filterVariant: "select",
      },
      {
        accessorKey: "notesValue",
        header: getText(i18nKeys.DQD_TABLE__COLUMN_NOTES_HEADER),
      },
      {
        accessorKey: "checkDescription",
        header: getText(i18nKeys.DQD_TABLE__COLUMN_DESCRIPTION_HEADER),
        size: 250,
      },
      {
        accessorKey: "pctViolatedRows",
        header: getText(i18nKeys.DQD_TABLE__COLUMN_VIOLATED_ROWS_HEADER),
      },
      {
        accessorKey: "isError",
        header: getText(i18nKeys.DQD_TABLE__COLUMN_IS_ERROR_HEADER),
        show: false,
      },
      {
        accessorKey: "notApplicable",
        header: getText(i18nKeys.DQD_TABLE__COLUMN_NOT_APPLICABLE_HEADER),
        show: false,
      },
    ],
    [data, getText]
  );

  const renderDetailPanel = ({ row }: { row: MRT_Row<CheckResults> }) => (
    <Box
      style={{
        margin: "auto",
        gridTemplateColumns: "1fr 1fr",
        width: "100%",
        whiteSpace: "pre-line",
      }}
    >
      <Card className="detail__card">
        <div style={{ display: "flex" }}>
          <Typography fontWeight={500}>{getText(i18nKeys.DQD_TABLE__COLUMN_LEVEL_HEADER)}:</Typography>
        </div>
        <Typography style={{ color: "grey", wordWrap: "break-word" }}>{row.original.checkName}</Typography>
      </Card>
      <Card className="detail__card">
        <div style={{ display: "flex" }}>
          <Typography fontWeight={500}>Description:</Typography>
        </div>
        <Typography style={{ color: "grey", wordWrap: "break-word" }}>{row.original.checkDescription}</Typography>
      </Card>
      <Card className="detail__card">
        <div style={{ display: "flex" }}>
          <Typography fontWeight={500}>Notes:</Typography>
        </div>
        <Typography style={{ color: "grey", wordWrap: "break-word" }}>
          {row.original.notesValue == null ? "-" : row.original.notesValue}
        </Typography>
      </Card>
      <Card className="detail__card">
        <div style={{ display: "flex" }}>
          <Typography fontWeight={500}>{getText(i18nKeys.DQD_TABLE__RENDER_DETAIL_PANE_LEVEL)}:</Typography>
        </div>
        <Typography style={{ color: "grey", wordWrap: "break-word" }}>{row.original.checkLevel}</Typography>
      </Card>
      <Card className="detail__card">
        <div style={{ display: "flex" }}>
          <Typography fontWeight={500}>{getText(i18nKeys.DQD_TABLE__RENDER_DETAIL_PANE_TABLE)}:</Typography>
        </div>
        <Typography style={{ color: "grey", wordWrap: "break-word" }}>{row.original.cdmTableName}</Typography>
      </Card>
      <Card className="detail__card">
        <div style={{ display: "flex" }}>
          <Typography fontWeight={500}>{getText(i18nKeys.DQD_TABLE__RENDER_DETAIL_PANE_FIELD)}:</Typography>
        </div>
        <Typography style={{ color: "grey", wordWrap: "break-word" }}>
          {row.original.cdmFieldName == null ? "-" : row.original.cdmFieldName}
        </Typography>
      </Card>
      <Card className="detail__card">
        <div style={{ display: "flex" }}>
          <Typography fontWeight={500}>{getText(i18nKeys.DQD_TABLE__RENDER_DETAIL_PANE_CONCEPT_ID)}:</Typography>
        </div>
        <Typography style={{ color: "grey", wordWrap: "break-word" }}>
          {row.original.conceptId == null ? "-" : row.original.conceptId}
        </Typography>
      </Card>
      <Card className="detail__card">
        <div style={{ display: "flex" }}>
          <Typography fontWeight={500}>{getText(i18nKeys.DQD_TABLE__RENDER_DETAIL_PANE_UNIT_CONCEPT_ID)}:</Typography>
        </div>
        <Typography style={{ color: "grey", wordWrap: "break-word" }}>
          {row.original.unitConceptId == null ? "-" : row.original.unitConceptId}
        </Typography>
      </Card>
      <Card className="detail__card">
        <div style={{ display: "flex" }}>
          <Typography fontWeight={500}>{getText(i18nKeys.DQD_TABLE__RENDER_DETAIL_PANE_NOT_APPLICABLE)}:</Typography>
        </div>
        <Typography style={{ color: "grey", wordWrap: "break-word" }}>
          {row.original.notApplicable == null ? "-" : mapIntToString(row.original.notApplicable)}
        </Typography>
      </Card>
      <Card className="detail__card">
        <div style={{ display: "flex" }}>
          <Typography fontWeight={500}>{getText(i18nKeys.DQD_TABLE__RENDER_DETAIL_PANE_CHECK_ID)}:</Typography>
        </div>
        <Typography style={{ color: "grey", wordWrap: "break-word" }}>{row.original.checkId}</Typography>
      </Card>
      <Card className="detail__card">
        <div style={{ display: "flex" }}>
          <Typography fontWeight={500}>
            {getText(i18nKeys.DQD_TABLE__RENDER_DETAIL_PANE_NUMBER_ROWS_VIOLATED)}:
          </Typography>
        </div>
        <Typography style={{ color: "grey", wordWrap: "break-word" }}>{row.original.numViolatedRows}</Typography>
      </Card>
      <Card className="detail__card">
        <div style={{ display: "flex" }}>
          <Typography fontWeight={500}>
            {getText(i18nKeys.DQD_TABLE__RENDER_DETAIL_PANE_PERCENTAGE_ROWS_VIOLATED)}:
          </Typography>
        </div>
        <Typography style={{ color: "grey", wordWrap: "break-word" }}>{row.original.pctViolatedRows}</Typography>
      </Card>
      <Card className="detail__card">
        <div style={{ display: "flex" }}>
          <Typography fontWeight={500}>
            {getText(i18nKeys.DQD_TABLE__RENDER_DETAIL_PANE_NUMBER_DENOMINATOR)}:
          </Typography>
        </div>
        <Typography style={{ color: "grey", wordWrap: "break-word" }}>{row.original.numDenominatorRows}</Typography>
      </Card>
      <Card className="detail__card">
        <div style={{ display: "flex" }}>
          <Typography fontWeight={500}>{getText(i18nKeys.DQD_TABLE__RENDER_DETAIL_PANE_EXECUTION_TIME)}:</Typography>
        </div>
        <Typography style={{ color: "grey", wordWrap: "break-word" }}>{row.original.executionTime}</Typography>
      </Card>
      <Card className="detail__card">
        <div style={{ display: "flex" }}>
          <Typography fontWeight={500}>{getText(i18nKeys.DQD_TABLE__RENDER_DETAIL_PANE_IS_ERROR)}:</Typography>
        </div>
        <Typography style={{ color: "grey", wordWrap: "break-word" }}>
          {row.original.isError == null ? "-" : mapIntToString(row.original.isError)}
        </Typography>
      </Card>
      <Card className="detail__card">
        <div style={{ display: "flex" }}>
          <Typography fontWeight={500}>{getText(i18nKeys.DQD_TABLE__RENDER_DETAIL_PANE_ERROR_MESSAGE)}:</Typography>
        </div>
        <Typography style={{ color: "grey", wordWrap: "break-word" }}>
          {row.original.error == null ? "-" : row.original.error}
        </Typography>
      </Card>
      <Card className="detail__card">
        <div style={{ display: "flex" }}>
          <Typography fontWeight={500}>{getText(i18nKeys.DQD_TABLE__RENDER_DETAIL_PANE_SQL_QUERY)}:</Typography>
        </div>
        <Typography style={{ color: "grey", wordWrap: "break-word" }}> {row.original.queryText}</Typography>
      </Card>
    </Box>
  );

  return (
    <MaterialReactTable
      columns={columns}
      data={data}
      initialState={{
        pagination: { pageSize: 5, pageIndex: 0 },
        showColumnFilters: false,
        columnVisibility: { isError: false, notApplicable: false },
      }}
      mrtTheme={(theme) => ({
        baseBackgroundColor: "#fff",
      })}
      enableFullScreenToggle={false}
      enableColumnResizing={true}
      enableDensityToggle={false}
      enableStickyHeader
      muiTableContainerProps={{ sx: { maxHeight: "600px" } }}
      columnResizeMode="onEnd"
      muiTablePaperProps={{
        elevation: 0,
        sx: {
          borderRadius: "0",
          border: "1px solid #dadbde",
        },
      }}
      muiTableHeadCellProps={{
        style: {
          fontWeight: "bold",
          fontSize: "16px",
        },
      }}
      muiTableBodyProps={{
        sx: {
          //stripe the rows, make adjacent row with different color
          "& tr:nth-of-type(4n-1)": {
            backgroundColor: "#ebf1f8",
          },
          "& tr:nth-of-type(4n-2)": {
            backgroundColor: "#ebf1f8",
          },
        },
      }}
      muiTableBodyCellProps={{
        style: {
          fontSize: "14px",
          color: "#000080",
        },
      }}
      muiSearchTextFieldProps={{
        color: "primary",
      }}
      muiTableHeadRowProps={{
        style: {
          backgroundColor: "#ebf1f8",
        },
      }}
      muiTableBodyRowProps={{
        hover: false,
      }}
      renderDetailPanel={renderDetailPanel}
      icons={{
        SearchIcon: () => <SearchIcon color="primary" />,
        SearchOffIcon: () => <SearchOffIcon color="primary" />,
        ExpandMoreIcon: () => <ExpandMoreIcon color="primary" />,
        MoreVertIcon: () => <MoreVertIcon color="primary" />,
        ClearAllIcon: () => <ExpandMoreIcon color="primary" />,
        KeyboardDoubleArrowDownIcon: () => <KeyboardDoubleArrowDownIcon color="primary" />,
        FilterListIcon: () => <FilterListIcon color="primary" />,
        FilterListOffIcon: () => <FilterListOffIcon color="primary" />,
        SortIcon: () => <SortIcon color="primary" />,
        ViewColumnIcon: () => <ViewColumnIcon color="primary" />,
        VisibilityOffIcon: () => <VisibilityOffIcon color="primary" />,
      }}
    />
  );
};

export default DQDTable;
