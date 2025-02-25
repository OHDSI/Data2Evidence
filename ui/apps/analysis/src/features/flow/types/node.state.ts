import { Node } from "reactflow";

export interface NodeDataState {
  name?: string;
  description?: string;
  result?: string;
  error?: boolean;
  errorMessage?: string;
  resultDate?: string;
}

export interface NodeState<TData extends NodeDataState = NodeDataState>
  extends Node<TData> {}

export interface AddNodeTypeDialogState {
  visible: boolean;
  nodeType?: string;
  selectedNodeId?: string;
  selectedNodeClassifier?: string;
}
