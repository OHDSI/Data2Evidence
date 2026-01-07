import { ThunkResult } from "~/store";
import { NodeDataState, NodeResultDto, NodeState } from "../types";
import { setNode } from "../reducers";

export const processFlowRunResults = (
  results: NodeResultDto[]
): ThunkResult<void> => {
  return async (dispatch, getState) => {
    if (!results || results.length === 0) return;

    for (const result of results) {
      const name = result.nodeName;
      const nodes = getState().flow.nodes.entities;

      // find the node based on the node name
      const currentId = Object.keys(nodes).find((id) => {
        const n = nodes[id];
        return n.data.name === name;
      });
      if (currentId == null) {
        continue;
      }

      const node: NodeState<NodeDataState> = {
        ...nodes[currentId],
        data: {
          ...nodes[currentId].data,
          result: JSON.stringify(result.taskRunResult.result),
          resultDate: result.createdDate,
          error: result.error,
          errorMessage: result.errorMessage,
        },
      };
      dispatch(setNode(node));
    }
  };
};
