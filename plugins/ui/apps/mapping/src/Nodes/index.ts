import { TableSourceNode } from "./TableSourceNode";
import { TableTargetNode } from "./TableTargetNode";
import { FieldNode } from "./FieldNode";

export const nodeTypes = {
  sourceTable: TableSourceNode,
  targetTable: TableTargetNode,
  fieldNode: FieldNode,
};

export * from "./MappingHandle";
