import React, { FC, useMemo } from "react";
import { MaterialReactTable, MRT_ColumnDef } from "material-react-table";

import "./TreeMapTable.scss";
import { useTranslation } from "../../../../contexts";

interface TreeMapTableProps {
  data: any;
  setSelectedConceptId: (value: string) => void;
  isSimpleFormat?: boolean;
}
const TreeMapTable: FC<TreeMapTableProps> = ({ data, setSelectedConceptId, isSimpleFormat = false }) => {
  const { getText, i18nKeys } = useTranslation();
  // column properties
  const columns = useMemo<MRT_ColumnDef<any>[]>(() => {
    const baseColumns: MRT_ColumnDef<any>[] = [
      {
        accessorKey: "CONCEPTID",
        header: getText(i18nKeys.TREE_MAP_TABLE__HEADER_CONCEPT_ID),
        ...(isSimpleFormat
          ? {}
          : {
              Cell: ({ cell }) => (
                <div className="concept_id_text" onClick={() => setSelectedConceptId(cell.getValue<string>())}>
                  {cell.getValue<string>()}
                </div>
              ),
            }),
      },
      {
        accessorKey: "CONCEPTPATH",
        header: getText(i18nKeys.TREE_MAP_TABLE__HEADER_CONCEPT_PATH),
      },
      {
        accessorKey: "NUMPERSONS",
        header: getText(i18nKeys.TREE_MAP_TABLE__HEADER_NUM_PERSONS),
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
  }, [setSelectedConceptId, isSimpleFormat, getText, i18nKeys]);

  return (
    <MaterialReactTable
      columns={columns}
      data={data}
      initialState={{ density: "compact" }}
      enableColumnResizing
      muiTableBodyCellProps={{
        sx: {
          fontSize: ".85em",
        },
      }}
    />
  );
};

export default TreeMapTable;
