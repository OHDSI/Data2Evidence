import { DataflowExportDto, SaveDataflowRevisonDto } from "../types";
import { sanitizeFlowEdges, sanitizeFlowNodes } from "./sanitizeFlow";

export type ParsedDataflowContent = Omit<SaveDataflowRevisonDto, "comment">;

export const parseDataflowJson = (jsonData: string): ParsedDataflowContent => {
  const json = JSON.parse(jsonData) as DataflowExportDto;

  if (!json || typeof json !== "object" || !Array.isArray(json.nodes)) {
    throw new Error("Not a valid dataflow export");
  }

  const nodes = sanitizeFlowNodes(json.nodes);
  return {
    nodes,
    edges: sanitizeFlowEdges(json.edges, nodes),
    variables: json.variables ?? [],
    importLibs: json.importLibs ?? [],
    databases: json.databases ?? [],
    schemas: json.schemas ?? [],
  };
};
