import { Node, Position } from "reactflow";
import { createSelector } from "reselect";
import { RootState } from "../../../store";
import { NodeState } from "../types";

export const selectFlowNodes = createSelector(
  (state: RootState) => state.flow.nodes,
  (nodesState): Node[] => {
    const nodes = Object.values(nodesState.entities) as NodeState[];
    // GroupNode should appear before child nodes as restrictions of reactflow
    const sortedNodes = nodes.sort((a, b) => {
      // If a has parentNode and b does not, b comes first
      if (a.parentNode && !b.parentNode) {
        return 1;
      }
      // If b has parentNode and a does not, a comes first
      if (b.parentNode && !a.parentNode) {
        return -1;
      }
      // For other cases or when both have parentNode or neither has parentNode,
      // maintain the original order
      return 0;
    });
    return sortedNodes.map((n) => ({
      ...n,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      dragHandle: "",
    }));
  }
);
