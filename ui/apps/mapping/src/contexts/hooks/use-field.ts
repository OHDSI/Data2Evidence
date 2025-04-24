import { useCallback, useContext } from "react";
import { Connection, EdgeChange, NodeChange, NodeProps } from "reactflow";
import { AppContext, AppDispatchContext } from "../AppContext";
import { ACTION_TYPES } from "../reducers/reducer";
import { FieldHandleData, FieldTargetHandleData } from "../states/field-state";

export const useField = () => {
  const {
    field: { nodes, edges, sourceHandles, targetHandles, activeSourceTable, activeTargetTable },
  } = useContext(AppContext);
  const dispatch = useContext(AppDispatchContext);

  const setFieldNodes = useCallback((nodes: NodeChange[]) => {
    dispatch({ type: ACTION_TYPES.SET_FIELD_NODES, payload: nodes });
  }, []);

  const setFieldEdges = useCallback((edges: EdgeChange[]) => {
    dispatch({ type: ACTION_TYPES.SET_FIELD_EDGES, payload: edges });
  }, []);

  const addFieldConnection = useCallback((connection: Connection) => {
    dispatch({ type: ACTION_TYPES.ADD_FIELD_CONNECTION, payload: connection });
  }, []);

  const setFieldSourceHandles = useCallback(
    (handles: { tableName: string; data: Partial<NodeProps<FieldHandleData>>[] }) => {
      dispatch({
        type: ACTION_TYPES.SET_FIELD_SOURCE_HANDLES,
        payload: handles,
      });
    },
    []
  );

  const setActiveSourceTable = useCallback((tableName: string) => {
    dispatch({
      type: ACTION_TYPES.SET_ACTIVE_SOURCE_TABLE,
      payload: tableName,
    });
  }, []);

  const setActiveFieldSourceHandles = useCallback((handles: Partial<NodeProps<FieldHandleData>>[]) => {
    dispatch({
      type: ACTION_TYPES.SET_ACTIVE_FIELD_SOURCE_HANDLES,
      payload: handles,
    });
  }, []);

  const setFieldTargetHandles = useCallback(
    (handles: { tableName: string; data: Partial<NodeProps<FieldTargetHandleData>>[] }) => {
      dispatch({
        type: ACTION_TYPES.SET_FIELD_TARGET_HANDLES,
        payload: handles,
      });
    },
    []
  );

  const setActiveTargetTable = useCallback((tableName: string) => {
    dispatch({
      type: ACTION_TYPES.SET_ACTIVE_TARGET_TABLE,
      payload: tableName,
    });
  }, []);

  const setActiveFieldTargetHandles = useCallback((handles: Partial<NodeProps<FieldTargetHandleData>>[]) => {
    dispatch({
      type: ACTION_TYPES.SET_ACTIVE_FIELD_TARGET_HANDLES,
      payload: handles,
    });
  }, []);

  return {
    nodes,
    edges,
    sourceHandles,
    targetHandles,
    activeSourceHandles: sourceHandles[activeSourceTable || ""],
    activeTargetHandles: targetHandles[activeTargetTable || ""],
    setFieldNodes,
    setFieldEdges,
    addFieldConnection,
    setFieldSourceHandles,
    setFieldTargetHandles,
    setActiveSourceTable,
    setActiveFieldSourceHandles,
    setActiveTargetTable,
    setActiveFieldTargetHandles,
  };
};
