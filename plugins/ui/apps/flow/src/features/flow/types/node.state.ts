import { Node } from "reactflow";

export interface NodeDataState {
  name?: string;
  description?: string;
  result?: string;
  error?: boolean;
  errorMessage?: string;
  resultDate?: string;
  executorOptions?: ExecutorOptions;
}

export interface NodeState<TData extends NodeDataState = NodeDataState>
  extends Node<TData> {}

export interface AddNodeTypeDialogState {
  visible: boolean;
}

export interface AddGroupDialogState {
  visible: boolean;
}

export interface ExecutorOptions {
  executorType: string;
  executorAddress: ExecutorAddress;
}

interface ExecutorAddress {
  host: string;
  port: number;
  ssl: boolean;
}
