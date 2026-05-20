import React, { FC, useMemo, useState } from "react";
import { MaterialReactTable, MRT_ColumnDef } from "material-react-table";
import { useTheme } from "@mui/material/styles";

import "./TreeMapTable.scss";
import { useTranslation } from "../../../../contexts";
import { formatNumber } from "../../../../utils";
interface TreeMapTableProps {
  data: any;
  setSelectedConcept: (value: { id: string; name: string } | null) => void;
  isSimpleFormat?: boolean;
}

const TreeMapTable: FC<TreeMapTableProps> = ({ data, setSelectedConcept, isSimpleFormat = false }) => {
  const { getText, i18nKeys } = useTranslation();
  const theme = useTheme();
  const [selectedRowId, setSelectedRowId] = useState<string>("");

  // column properties
  const columns = useMemo<MRT_ColumnDef<any>[]>(() => {
    const baseColumns: MRT_ColumnDef<any>[] = [
      {
        accessorKey: "CONCEPTID",
        header: getText(i18nKeys.TREE_MAP_TABLE__HEADER_CONCEPT_ID),
        ...(!isSimpleFormat && {
          Cell: ({ cell }) => <div className="concept_id_text">{cell.getValue<string>()}</div>,
        }),
      },
      {
        accessorKey: "CONCEPTPATH",
        header: getText(i18nKeys.TREE_MAP_TABLE__HEADER_CONCEPT_PATH),
      },
      {
        accessorKey: "NUMPERSONS",
        header: getText(i18nKeys.TREE_MAP_TABLE__HEADER_NUM_PERSONS),
        Cell: ({ cell }) => formatNumber(cell.getValue<number>()),
        muiTableHeadCellProps: {
          align: "right",
        },
        muiTableBodyCellProps: {
          align: "right",
        },
      },
      {
        accessorKey: isSimpleFormat ? "PERCENT_PERSONS" : "PERCENTPERSONS",
        header: getText(i18nKeys.TREE_MAP_TABLE__HEADER_PERCENT_PERSONS),
        muiTableHeadCellProps: {
          align: "right",
        },
        muiTableBodyCellProps: {
          align: "right",
        },
      },
    ];

    // Add RECORDSPERPERSON column only for non-simple format
    if (!isSimpleFormat) {
      baseColumns.push({
        accessorKey: "RECORDSPERPERSON",
        header: getText(i18nKeys.TREE_MAP_TABLE__HEADER_RECORDS_PER_PERSON),
        muiTableHeadCellProps: {
          align: "right",
        },
        muiTableBodyCellProps: {
          align: "right",
        },
      });
    }

    return baseColumns;
  }, [setSelectedConcept, isSimpleFormat, getText, i18nKeys]);

  return (
    <MaterialReactTable
      columns={columns}
      data={data}
      initialState={{ density: "compact" }}
      enableColumnResizing
      muiTableBodyCellProps={{
        sx: {
          fontSize: ".85em",
          border: "none",
        },
      }}
      muiTableBodyRowProps={({ row, staticRowIndex }) => ({
        onClick: () => {
          setSelectedRowId(row.id);
          setSelectedConcept({
            id: row.original.CONCEPTID,
            name: row.original.CONCEPTPATH,
          });
        },
        sx: {
          cursor: "pointer",
          borderBottom: "none",
          border:
            row.id === selectedRowId ? `2px solid ${theme.palette.custom.selectedRowBorder}` : "2px solid transparent",
          boxSizing: "border-box",
          backgroundColor: staticRowIndex % 2 ? theme.palette.custom.alternateRowBg : "white",
          "& td": {
            borderBottom: "none",
          },
        },
      })}
      muiTableHeadRowProps={{
        sx: {
          backgroundColor: theme.palette.custom.tableHeaderBg,
        },
      }}
      muiTopToolbarProps={{
        sx: {
          backgroundColor: theme.palette.custom.tableHeaderBg,
        },
      }}
      muiBottomToolbarProps={{
        sx: {
          background: "none",
        },
      }}
      muiTablePaperProps={{
        sx: {
          backgroundColor: "transparent",
        },
      }}
    />
  );
};

export default TreeMapTable;
