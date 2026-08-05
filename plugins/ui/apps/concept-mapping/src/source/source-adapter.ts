import { SourceData, SourceNodeDTO } from "../types/source";
import { csvDataType, mappingData } from "../types";

// Sentinel constant reserved for column-mapping "Not applicable" option (Task 4+)
export const NOT_APPLICABLE = "__NOT_APPLICABLE__";

export function parseSqlResultColumns(result?: string): string[] | null {
  if (!result) return null;
  try {
    const parsed = JSON.parse(result);
    const firstRow = Array.isArray(parsed) ? parsed[0] : parsed;
    if (firstRow && typeof firstRow === "object") {
      const cols = Object.keys(firstRow);
      return cols.length > 0 ? cols : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function extractColumns(node: SourceNodeDTO): string[] | null {
  if (node.type === "py2table_node" && node.map) {
    const cols = Object.keys(node.map);
    return cols.length > 0 ? cols : null;
  }
  if (node.type === "sql_node") {
    return parseSqlResultColumns(node.result);
  }
  return null;
}

export function buildNodeSourceData(node: SourceNodeDTO): SourceData {
  return {
    type: "node",
    columns: extractColumns(node) ?? [],
    nodeMeta: {
      name: node.name,
      type: node.type,
      description: node.description,
    },
  };
}

export function buildCsvSourceData(
  name: string,
  columns: string[],
  rows: Array<Record<string, any>>,
  size?: number
): SourceData {
  return { type: "csv", name, size, columns, rows };
}

// Bridge a SourceData into the mapping-table csvData that Step 3 (MappingTable,
// auto-populate, Save) operates on. Rows are tagged `status: "unchecked"`, mirroring the
// old ImportDialog.handleImport semantics. NOTE: only CSV sources carry rows client-side;
// node sources expose columns only (their actual output rows require backend execution,
// which is out of scope), so `data` is legitimately empty for a node source.
export function sourceDataToCsvData(source: SourceData): csvDataType {
  return {
    name: source.name ?? "",
    columns: source.columns,
    data: (source.rows ?? []).map((r) => ({ ...r, status: "unchecked" })) as mappingData[],
  };
}
