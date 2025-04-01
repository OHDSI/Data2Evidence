import { Node, Edge, NodeProps } from "reactflow";

export interface TableSourceHandleData {
  label: string;
  type: "input";
}

export interface TableTargetHandleData {
  label: string;
  tableName: string;
}

export type TableSourceState = NodeProps<TableSourceHandleData>;
export type TableTargetState = NodeProps<TableTargetHandleData>;

export interface TableState {
  nodes: Node[];
  edges: Edge[];
  sourceHandles: TableSourceState[];
  targetHandles: TableTargetState[];
}
