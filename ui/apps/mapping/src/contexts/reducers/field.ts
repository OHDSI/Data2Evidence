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
import { FieldTargetHandleData } from "../states/field-state";

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

export const setActiveTableEdgeId = (state: AppState, payload: string): AppState => ({
  ...state,
  saved: false,
  field: {
    ...state.field,
    activeTableEdgeId: payload,
  },
});

export const setActiveFieldTargetHandles = (state: AppState, payload: NodeProps<FieldTargetHandleData>[]): AppState => {
  if (!state.field.activeTableEdgeId) {
    console.warn("Invalid operation to set field target handles when active table edge ID is empty");
    return state;
  }

  return {
    ...state,
    saved: false,
    fieldMap: {
      ...state.fieldMap,
      [state.field.activeTableEdgeId]: {
        ...state.fieldMap[state.field.activeTableEdgeId],
        targetHandles: payload,
      },
    },
  };
};
