import {
  Case,
  SqlFunctionDateAdd,
  SqlFunctionDatePart,
  SqlFunctionForTransformationState,
  SqlFunctionReplace,
  SqlFunctionSwitchCase,
  SqlFunctionValue,
} from "../../../../../contexts";

export const getPreviewSql = (
  fieldName: string | undefined,
  fieldType: string | undefined,
  functions: SqlFunctionForTransformationState<SqlFunctionValue | null>[]
) => {
  if (!fieldName || !fieldType) {
    return fieldName || "";
  }

  return functions.length === 0
    ? fieldName
    : functions
        .slice()
        .reverse()
        .reduce((acc, { type, value }) => {
          if (type === "REPLACE") {
            const func = value as SqlFunctionReplace;
            const oldValue = getValueByType(fieldType, func?.oldValue);
            const newValue = getValueByType(fieldType, func?.newValue);
            return `REPLACE(${acc}, ${oldValue}, ${newValue})`;
          } else if (type === "DATEPART") {
            const func = value as SqlFunctionDatePart;
            const part = func?.part;
            return `date_part('${part}', ${acc})`;
          } else if (type === "DATEADD") {
            const func = value as SqlFunctionDateAdd;
            const part = func?.part;
            const number = func?.number;
            return `${acc} + (${number} * interval '1 ${part}')`;
          } else if (type === "CASE") {
            const func = value as SqlFunctionSwitchCase;
            const cases = [...func?.cases];

            let defaultBlock = "";
            if (cases[cases.length - 1].isDefault) {
              const defaultCase = cases.pop();
              defaultBlock = `\n\tELSE ${getValueByType(fieldType, defaultCase?.out || "")}`;
            }

            const reducer = (acc: string, curr: Case) => {
              const when = getValueByType(fieldType, curr?.in || "");
              const then = getValueByType(fieldType, curr?.out || "");
              return acc + `\n\tWHEN ${when} THEN ${then}`;
            };

            return `CASE(${acc})${cases.reduce(reducer, "")}${defaultBlock}\nEND`;
          }

          return acc;
        }, fieldName);
};

const getValueByType = (type: string, value: string | number): string => {
  switch (type) {
    case "string":
      return `'${value}'`;
    case "integer":
      return `${value}`;
    case "date":
    case "datetime":
    case "time":
      return `'${value}'`;
    default: // Other types handle as string
      return `'${value}'`;
  }
};
