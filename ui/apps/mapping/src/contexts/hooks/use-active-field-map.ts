import { useCallback, useContext } from "react";
import { NodeProps } from "reactflow";
import { AppContext, AppDispatchContext } from "../AppContext";
import { ACTION_TYPES } from "../reducers/reducer";
import { FieldTargetHandleData } from "../states/field-state";

export const useActiveFieldMap = () => {
  const {
    field: { activeTableEdgeId },
    fieldMap,
  } = useContext(AppContext);
  const { sourceHandles, targetHandles } = fieldMap[activeTableEdgeId || ""] || {};
  const dispatch = useContext(AppDispatchContext);

  const setFieldTargetHandles = useCallback((handles: Partial<NodeProps<FieldTargetHandleData>>[]) => {
    dispatch({
      type: ACTION_TYPES.SET_ACTIVE_FIELD_TARGET_HANDLES,
      payload: handles,
    });
  }, []);

  return {
    sourceHandles,
    targetHandles,
    fieldMap,
    setFieldTargetHandles,
  };
};
