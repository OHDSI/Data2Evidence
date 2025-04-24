import { useCallback, useContext } from "react";
import { Connection, EdgeChange, NodeChange, NodeProps } from "reactflow";
import { AppContext, AppDispatchContext } from "../AppContext";
import { ACTION_TYPES } from "../reducers/reducer";
import {
  TableSourceHandleData,
  TableTargetHandleData,
} from "../states/table-state";

export const useTable = () => {
  const {
    table: { nodes, edges, sourceHandles, targetHandles },
  } = useContext(AppContext);
  const dispatch = useContext(AppDispatchContext);

  const setTableNodes = useCallback((nodes: NodeChange[]) => {
    dispatch({ type: ACTION_TYPES.SET_TABLE_NODES, payload: nodes });
  }, []);

  const setTableEdges = useCallback((edges: EdgeChange[]) => {
    dispatch({ type: ACTION_TYPES.SET_TABLE_EDGES, payload: edges });
  }, []);

  const addTableConnection = useCallback((connection: Connection) => {
    dispatch({ type: ACTION_TYPES.ADD_TABLE_CONNECTION, payload: connection });
  }, []);

  const setTableSourceHandles = useCallback(
    (handles: Partial<NodeProps<TableSourceHandleData>>[]) => {
      dispatch({
        type: ACTION_TYPES.SET_TABLE_SOURCE_HANDLES,
        payload: handles,
      });
    },
    []
  );

  const setTableTargetHandles = useCallback(
    (handles: Partial<NodeProps<TableTargetHandleData>>[]) => {
      dispatch({
        type: ACTION_TYPES.SET_TABLE_TARGET_HANDLES,
        payload: handles,
      });
    },
    []
  );

  return {
    nodes,
    edges,
    sourceHandles,
    targetHandles,
    setTableNodes,
    setTableEdges,
    addTableConnection,
    setTableSourceHandles,
    setTableTargetHandles,
  };
};
