import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Connection,
  Edge,
  EdgeChange,
  MarkerType,
  NodeChange,
  NodeProps,
} from "reactflow";
import { AppState, FieldSourceState, FieldTargetState, TableSchemaState } from "../states";
import { TableSourceHandleData, TableTargetHandleData } from "../states/table-state";
import { buildFieldHandle, getColumns } from "../../utils/utils";

const prepareHandles = (sourceTables: TableSchemaState[], targetTables: TableSchemaState[], newTableEdge?: Edge) => {
  let sourceHandles: FieldSourceState[] = [];
  let targetHandles: FieldTargetState[] = [];

  if (sourceTables) {
    const sourceTable = sourceTables.find((table) => table.table_name === newTableEdge?.sourceHandle);
    if (sourceTable) {
      const tableName = sourceTable.table_name;
      const columns = getColumns(sourceTables, tableName);
      const handles = buildFieldHandle(columns, tableName, true);
      sourceHandles = handles as FieldSourceState[];
    }
  }

  const targetTable = targetTables.find((table) => table.table_name === newTableEdge?.targetHandle);
  if (targetTable) {
    const tableName = targetTable.table_name;
    const columns = getColumns(targetTables, tableName);
    const handles = buildFieldHandle(columns, tableName, false);
    targetHandles = handles as FieldTargetState[];
  }
  return { sourceHandles, targetHandles };
};

export const setTableNodes = (state: AppState, payload: NodeChange[]): AppState => ({
  ...state,
  table: {
    ...state.table,
    nodes: applyNodeChanges(payload, state.table.nodes),
  },
});

export const setTableEdges = (state: AppState, payload: { reset: boolean; changes: EdgeChange[] }): AppState => {
  const edges = applyEdgeChanges(payload.changes, state.table.edges);

  const fieldMap: Record<string, { sourceHandles: FieldSourceState[]; targetHandles: FieldTargetState[] }> = {};
  if (payload.reset) {
    edges.forEach((edge) => {
      const newEdge = edges.find(
        (e) =>
          e.source === edge.source &&
          e.target === edge.target &&
          e.sourceHandle === edge.sourceHandle &&
          e.targetHandle === edge.targetHandle
      );

      if (newEdge) {
        const { sourceHandles, targetHandles } = prepareHandles(
          state.scannedSchema?.source_tables || [],
          state.cdmTables,
          newEdge
        );
        fieldMap[newEdge.id] = {
          sourceHandles,
          targetHandles,
        };
      }
    });
  }

  return {
    ...state,
    table: {
      ...state.table,
      edges,
    },
    fieldMap: {
      ...state.fieldMap,
      ...fieldMap,
    },
  };
};

export const addTableConnection = (state: AppState, payload: Connection): AppState => {
  const edge = {
    ...payload,
    style: {
      strokeWidth: 2,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
    },
  };

  const edges = addEdge(edge, state.table.edges);

  const newEdge = edges.find(
    (e) =>
      e.source === edge.source &&
      e.target === edge.target &&
      e.sourceHandle === edge.sourceHandle &&
      e.targetHandle === edge.targetHandle
  );

  const tableEdgeId = newEdge?.id || "";

  const { sourceHandles, targetHandles } = prepareHandles(
    state.scannedSchema?.source_tables || [],
    state.cdmTables,
    newEdge
  );

  return {
    ...state,
    saved: false,
    table: {
      ...state.table,
      edges,
    },
    fieldMap: {
      ...state.fieldMap,
      [tableEdgeId]: {
        sourceHandles,
        targetHandles,
      },
    },
  };
};

export const setTableSourceHandles = (state: AppState, payload: NodeProps<TableSourceHandleData>[]): AppState => ({
  ...state,
  saved: false,
  table: {
    ...state.table,
    sourceHandles: payload,
  },
});

export const setTableTargetHandles = (state: AppState, payload: NodeProps<TableTargetHandleData>[]): AppState => ({
  ...state,
  saved: false,
  table: {
    ...state.table,
    targetHandles: payload,
  },
});
