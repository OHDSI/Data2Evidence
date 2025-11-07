import { useCallback, useContext } from "react";
import { Connection, EdgeChange, NodeChange } from "reactflow";
import { AppContext, AppDispatchContext } from "../AppContext";
import { ACTION_TYPES } from "../reducers/reducer";

export const useField = () => {
  const {
    field: { nodes, edges },
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

  const setActiveTableEdgeId = useCallback((tableName: string) => {
    dispatch({
      type: ACTION_TYPES.SET_ACTIVE_SOURCE_TABLE,
      payload: tableName,
    });
  }, []);

  return {
    nodes: nodes || [],
    edges: edges || [],
    setFieldNodes,
    setFieldEdges,
    addFieldConnection,
    setActiveTableEdgeId,
  };
};
