import { Node } from "reactflow";
import { createSelector } from "reselect";
import { RootState } from "~/store";
import { NodeDataState } from "../types";

export const selectSourceNodes = createSelector(
  [
    (state: RootState) => state.flow.nodes,
    (state: RootState) => state.flow.edges,
    (state: RootState, currentNodeId: string) => currentNodeId,
  ],
  (nodesState, edgesState, currentNodeId): Node<NodeDataState>[] => {
    const currentNode = nodesState.entities[currentNodeId];
    if (!currentNode) return [];

    const sourceEges = Object.values(edgesState.entities).filter(
      (e) => e.target === currentNodeId
    );

    const sourceNodeIds = sourceEges.map((e) => e.source);
    const sourceNodes = Object.values(nodesState.entities).filter((n) =>
      sourceNodeIds.includes(n.id)
    );

    return sourceNodes;
  }
);
