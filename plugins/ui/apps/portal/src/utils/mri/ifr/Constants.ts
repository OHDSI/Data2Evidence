enum LogicalOperator {
  AND = "AND",
  OR = "OR",
}

enum ComparisonOperator {
  EQUAL = "=",
  NOT_EQUAL = "<>",
  MORE_THAN_EQUAL = ">=",
  LESS_THAN_EQUAL = "<=",
  MORE_THAN = ">",
  LESS_THAN = "<",
}

enum CardType {
  INCLUDED = "INCLUDED",
  EXCLUDED = "EXCLUDED",
}
export interface Column {
  configPath: string;
  order: string;
  seq: number;
}

export const BOOLEAN_CONTAINER = "BooleanContainer";

export { LogicalOperator, ComparisonOperator, CardType };
