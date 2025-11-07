import { createSelector } from "reselect";
import { RootState } from "../../../store";
import { NodeState } from "../types";

export const selectLastNode = createSelector(
  (state: RootState) => state.flow.nodes,
  (nodesState) => {
    const nodes = Object.values(nodesState.entities) as NodeState[];
    const maxNode = nodes?.reduce(
      (acc, node) => (acc?.position.x > node.position.x ? acc : node),
      undefined
    );
    return maxNode;
  }
);
