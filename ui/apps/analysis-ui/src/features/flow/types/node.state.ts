import { Node } from "reactflow";
import { NodeType } from "../containers/Node/NodeTypes";
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
  nodeHandleLabel?: string;
  handleType?: "input" | "output";
  nodeType?: NodeType;
  selectedNodeId?: string;
  selectedNodeHandleType?: string;
}
