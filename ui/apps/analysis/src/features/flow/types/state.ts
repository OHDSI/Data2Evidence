import { EntityState } from "@reduxjs/toolkit";
import { FlowStatus, SaveFlowDialogState } from "./dataflow.state";
import { EdgeState } from "./edge.state";
import { FlowRunState } from "./flow-run.state";
import { AddNodeTypeDialogState, NodeState } from "./node.state";

export interface FlowRootState {
  dataflowId: string;
  revisionId: string;
  addNodeTypeDialog: AddNodeTypeDialogState;
  saveFlowDialog: SaveFlowDialogState;
  isTestMode: boolean;
  uploadResults: boolean;

  status: FlowStatus | undefined;
  flowRunState: EntityState<FlowRunState>;
  nodes: EntityState<NodeState>;
  edges: EntityState<EdgeState>;
}
