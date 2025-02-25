import { Node, Edge, NodeProps } from "reactflow";

export interface FieldNodeData {
  type: "source" | "target";
}

export interface FieldHandleData extends TransformationConfig {
  label: string;
  tableName: string;
  isField: boolean;
  columnType: string;
  isNullable: boolean;
  type: "input" | "output";
}

export type FieldSourceHandleData = FieldHandleData;

export enum FunctionType {
  REPLACE = "REPLACE",
  DATEPART = "DATEPART",
  DATEADD = "DATEADD",
  CASE = "CASE",
  TRIM = "TRIM",
  UPPER = "UPPER",
  LOWER = "LOWER",
}

export enum DatePart {
  YEAR = "Year",
  MONTH = "Month",
  DAY = "Day",
  HOUR = "Hour",
  MINUTE = "Minute",
  SECOND = "Second",
}

export type SQLViewMode = "visual" | "manual";

export interface SqlFunctionReplace {
  oldValue: string;
  newValue: string;
}

export interface SqlFunctionDatePart {
  part: string;
}

export interface SqlFunctionDateAdd {
  part: string;
  number: number;
}

export interface Case {
  id: number;
  in?: string | number;
  out?: string | number;
  isDefault?: boolean;
}

export interface SqlFunctionSwitchCase {
  cases: Case[];
}

export type SqlFunctionValue = SqlFunctionReplace | SqlFunctionDatePart | SqlFunctionDateAdd | SqlFunctionSwitchCase;

export interface SqlTransformationConfig {
  isSqlEnabled: boolean;
  sqlViewMode: SQLViewMode;
  canSwitchToVisualMode: boolean;
  functions: SqlFunctionForTransformationState<SqlFunctionValue | null>[];
  sql: string;
}

export interface SqlFunctionForTransformationState<T = any> {
  type: FunctionType | undefined;
  value: T;
}

export interface LookupListItem {
  id?: number;
  name: string;
}

export interface LookupConfig {
  isLookupEnabled: boolean;
  lookupName?: string;
  lookupSql: string;
}

export interface TransformationConfig extends SqlTransformationConfig, LookupConfig {}

export interface FieldTargetHandleData extends FieldHandleData, TransformationConfig {
  constantValue?: string | number;
  comment?: string;
}

export type FieldSourceState = NodeProps<FieldSourceHandleData>;
export type FieldTargetState = NodeProps<FieldTargetHandleData>;

export interface FieldState {
  nodes: Node<FieldNodeData>[];
  edges: Edge[];
  sourceHandles: { [tableName: string]: FieldSourceState[] };
  targetHandles: { [tableName: string]: FieldTargetState[] };
  activeSourceTable?: string;
  activeTargetTable?: string;
}
