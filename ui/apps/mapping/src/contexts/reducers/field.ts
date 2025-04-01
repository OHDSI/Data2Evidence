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
import { FieldHandleData, FieldTargetHandleData } from "../states/field-state";

export const setFieldNodes = (state: AppState, payload: NodeChange[]): AppState => ({
  ...state,
  field: {
    ...state.field,
    nodes: applyNodeChanges(payload, state.field.nodes),
  },
});

export const setFieldEdges = (state: AppState, payload: EdgeChange[]): AppState => ({
  ...state,
  field: {
    ...state.field,
    edges: applyEdgeChanges(payload, state.field.edges),
  },
});

export const addFieldConnection = (state: AppState, payload: Connection): AppState => {
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
    field: {
      ...state.field,
      edges: addEdge(edge, state.field.edges),
    },
  };
};

export const setFieldSourceHandles = (
  state: AppState,
  payload: { tableName: string; data: NodeProps<FieldHandleData>[] }
): AppState => ({
  ...state,
  saved: false,
  field: {
    ...state.field,
    sourceHandles: {
      ...state.field.sourceHandles,
      [payload.tableName]: payload.data,
    },
  },
});

export const setActiveSourceTable = (state: AppState, payload: string): AppState => ({
  ...state,
  saved: false,
  field: {
    ...state.field,
    activeSourceTable: payload,
  },
});

export const setActiveFieldSourceHandles = (state: AppState, payload: NodeProps<FieldHandleData>[]): AppState => {
  if (!state.field.activeSourceTable) {
    console.warn("Invalid operation to set field source handles when active source table is empty");
    return state;
  }

  return {
    ...state,
    saved: false,
    field: {
      ...state.field,
      sourceHandles: {
        ...state.field.sourceHandles,
        [state.field.activeSourceTable]: payload,
      },
    },
  };
};

export const setFieldTargetHandles = (
  state: AppState,
  payload: { tableName: string; data: NodeProps<FieldTargetHandleData>[] }
): AppState => ({
  ...state,
  saved: false,
  field: {
    ...state.field,
    targetHandles: {
      ...state.field.targetHandles,
      [payload.tableName]: payload.data,
    },
  },
});

export const setActiveTargetTable = (state: AppState, payload: string): AppState => ({
  ...state,
  saved: false,
  field: {
    ...state.field,
    activeTargetTable: payload,
  },
});

export const setActiveFieldTargetHandles = (state: AppState, payload: NodeProps<FieldTargetHandleData>[]): AppState => {
  if (!state.field.activeTargetTable) {
    console.warn("Invalid operation to set field target handles when active target table is empty");
    return state;
  }

  return {
    ...state,
    saved: false,
    field: {
      ...state.field,
      targetHandles: {
        ...state.field.targetHandles,
        [state.field.activeTargetTable]: payload,
      },
    },
  };
};
