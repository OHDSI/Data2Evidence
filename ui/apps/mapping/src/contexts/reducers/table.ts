import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Connection,
  EdgeChange,
  MarkerType,
  NodeChange,
  NodeProps,
} from "reactflow";
import { AppState } from "../states";
import {
  TableSourceHandleData,
  TableTargetHandleData,
} from "../states/table-state";

export const setTableNodes = (
  state: AppState,
  payload: NodeChange[]
): AppState => ({
  ...state,
  table: {
    ...state.table,
    nodes: applyNodeChanges(payload, state.table.nodes),
  },
});

export const setTableEdges = (
  state: AppState,
  payload: EdgeChange[]
): AppState => ({
  ...state,
  table: {
    ...state.table,
    edges: applyEdgeChanges(payload, state.table.edges),
  },
});

export const addTableConnection = (
  state: AppState,
  payload: Connection
): AppState => {
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

  return {
    ...state,
    saved: false,
    table: {
      ...state.table,
      edges: addEdge(edge, state.table.edges),
    },
  };
};

export const setTableSourceHandles = (
  state: AppState,
  payload: NodeProps<TableSourceHandleData>[]
): AppState => ({
  ...state,
  saved: false,
  table: {
    ...state.table,
    sourceHandles: payload,
  },
});

export const setTableTargetHandles = (
  state: AppState,
  payload: NodeProps<TableTargetHandleData>[]
): AppState => ({
  ...state,
  saved: false,
  table: {
    ...state.table,
    targetHandles: payload,
  },
});
