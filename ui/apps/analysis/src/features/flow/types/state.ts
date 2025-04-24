import { EntityState } from "@reduxjs/toolkit";
import { EdgeState } from "./edge.state";
import { AddNodeTypeDialogState, NodeState } from "./node.state";
import { FlowStatus, SaveFlowDialogState } from "./dataflow.state";
import { FlowRunState } from "./flow-run.state";

export interface FlowRootState {
  dataflowId: string;
  revisionId: string;
  addNodeTypeDialog: AddNodeTypeDialogState;
  saveFlowDialog: SaveFlowDialogState;
  isTestMode: boolean;

  status: FlowStatus | undefined;
  flowRunState: EntityState<FlowRunState>;
  nodes: EntityState<NodeState>;
  edges: EntityState<EdgeState>;
}
