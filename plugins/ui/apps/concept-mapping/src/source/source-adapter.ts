import { SourceData, SourceNodeDTO } from "../types/source";

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
  _name: string,
  columns: string[],
  rows: Array<Record<string, any>>
): SourceData {
  return { type: "csv", columns, rows };
}
