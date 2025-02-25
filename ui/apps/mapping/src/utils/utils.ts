import { Position } from "reactflow";
import { FieldHandleData, TableSchemaState } from "../contexts";

export const saveBlobAs = (obj: Blob, filename: string) => {
  const url = URL.createObjectURL(obj);
  const link = document.createElement("a");
  link.href = url;

  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();

  if (link.parentNode) link.parentNode.removeChild(link);
};

export const getColumns = (tables: TableSchemaState[], tableName: string) => {
  const table = tables.find((t) => t.table_name === tableName);
  return table?.column_list || [];
};

export const buildFieldHandle = (columnList: any[], tableName: string, isSource?: boolean) =>
  columnList.map((column, index) => ({
    id: `FIELD.${index + 1}`,
    data: {
      label: column.column_name,
      tableName: tableName,
      isField: true,
      columnType: column.column_type,
      isNullable: column.is_column_nullable,
      type: isSource ? "input" : "output",
    } as FieldHandleData,
    targetPosition: isSource ? Position.Right : Position.Left,
  }));
