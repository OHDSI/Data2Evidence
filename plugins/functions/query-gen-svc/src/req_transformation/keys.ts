/***************************SQL CONTEXT***************************/
export const SQLTERM_AGGREGATE_COUNT = "Count";
export const SQLTERM_AGGREGATE_AVG = "Avg";
export const SQLTERM_SET_OP_UNION = "Union";

export const SQLTERM_CAMEL_CONJUNCTIVE_AND = "And";
export const SQLTERM_CAMEL_CONJUNCTIVE_OR = "Or";

export const SQLTERM_LOWER_CONJUNCTIVE_AND = "and";
export const SQLTERM_LOWER_CONJUNCTIVE_OR = "or";
export const SQLTERM_LOWER_INEQUALITY_CONTAINS = "contains";

export const SQLTERM_INEQUALITY_SYMBOL_EQUAL = "=";
export const SQLTERM_INEQUALITY_SYMBOL_LESSOREQUAL = "<=";
export const SQLTERM_INEQUALITY_SYMBOL_LESS = "<";
export const SQLTERM_INEQUALITY_SYMBOL_GREATER = ">";
export const SQLTERM_INEQUALITY_SYMBOL_GREATEROREQUAL = ">=";
export const SQLTERM_INEQUALITY_SYMBOL_NOTEQUAL = "<>";

export const SQLTERM_INEQUALITY_ISNULL = "IsNull";
export const SQLTERM_INEQUALITY_ISNOTNULL = "IsNotNull";

export const SQLTERM_INEQUALITY_EQUAL = "Equal";
export const SQLTERM_INEQUALITY_LESSOREQUAL = "LessOrEqual";
export const SQLTERM_INEQUALITY_LESS = "Less";
export const SQLTERM_INEQUALITY_GREATER = "Greater";
export const SQLTERM_INEQUALITY_GREATEROREQUAL = "GreaterOrEqual";
export const SQLTERM_INEQUALITY_NOTEQUAL = "NotEqual";
/***************************CQL CONTEXT***************************/
export const CQLTERM_EXPRESSIONREF = "ExpressionRef";
export const CQLTERM_PROPERTY = "Property";
export const CQLTERM_LITERAL = "Literal";
export const CQLTERM_WITH = "With";
export const CQLTERM_WITHOUT = "Without";
export const CQLTERM_LEFTJOIN = "LeftJoin";
export const CQLTERM_QUERY = "Query";
export const CQLTERM_RETRIEVE = "Retrieve";
export const CQLTERM_PUBLIC = "Public";

//DurationBetween Related Terms
export const CQLTERM_DURATIONBETWEEN = "DurationBetween";
export const CQLTERM_DURATIONBETWEEN_PRECISION_DAY = "Day";

//Datatypes
export const CQLTERM_DATATYPES_INTEGER = "Integer";
export const CQLTERM_DATATYPES_STRING = "String";

//Non parameterized sql function
export const CQLTERM_DATATYPES_SQL_FUNCTION = "SQLFunction";

//Context types
export const CQLTERM_CONTEXT_PATIENT = "patient";
export const CQLTERM_CONTEXT_POPULATION = "population";

//Pseudo CQL Terms
export const CQLTERM_AGGREGATEEXPRESSION = "AggregateExpression";

/***************************GENERAL CONTEXT***************************/
export const TERM_CAMEL_START = "Start";
export const TERM_CAMEL_END = "End";
export const TERM_LOWER_START = "start";
export const TERM_LOWER_END = "end";
export const TERM_EMPTYSTRING = "";

export const TERM_WHERE = "WHERE";
export const TERM_GROUPBY = "GROUPBY";
export const TERM_MEASURE = "MEASURE";
export const TERM_HAVING = "HAVING";

export const TERM_REQUESTVALUE = "requestValue";

export const TERM_ASC = "ASC";
export const TERM_DSC = "DSC";

export const TERM_UNDEFINED = "undefined";

export const TERM_DELIMITER_DASH = "-";
export const TERM_DELIMITER_PRD = ".";

export const TERM_OPERANDTYPE_LITERAL = "literalOp";
export const TERM_OPERANDTYPE_EXPRESSION = "expressionOp";
export const TERM_OPERANDTYPE_ABSTIME = "abstime";
export const TERM_OPERANDTYPE_DURATIONBETWEEN = "durationBetweenOp";
export const TERM_OPERANDTYPE_RANGE = "rangeOp";
export const TERM_OPERANDTYPE_SQLFUNCTION = "sqlFunction";

/***************************DEFINITION NAMES***************************/
export const DEF_PATIENTREQUEST = "PatientRequest";
export const DEF_PATIENTREQUESTS = "PatientRequests";
export const DEF_PATIENT_REQUEST_ENTRYEXIT = "PatientRequestEntryExit";
export const DEF_AGGREGATE = "MeasurePopulation";

/***************************MRI CONTEXT***************************/
export const MRITERM_FILTER = "filter";
export const MRITERM_VALUE = "value";
export const MRITERM_XAXIS = "xaxis";
export const MRITERM_YAXIS = "yaxis";
export const MRITERM_INTERACTIONID = "INTERACTION_ID";

export const MRITERM_ISFILTERCARD = "isFiltercard";

export const MRITERM_MEASUREEXPRESSION = "measureExpression";
export const MRITERM_TYPE = "type";

export const MRITERM_PID = "pid";
export const MRITERM_PID_ALIAS = "patient.attributes.pid";
export const MRITERM_PID_TEMPLATEID = "patient-attributes-pid";

export const MRITERM_PCOUNT = "pcount";
export const MRITERM_PCOUNT_ALIAS = "patient.attributes.pcount";
export const MRITERM_PCOUNT_TEMPLATEID = "patient-attributes-pcount";

export const MRITERM_PARENTINTERACTION_REQ = "parentInteraction";
export const MRITERM_PARENTINTERACTION = "PARENT_INTERACT_ID";

export const MRITERM_TEMPORALQUERY = "_tempQ";
export const MRITERM_JOINQUERY = "JOIN_QUERY";
