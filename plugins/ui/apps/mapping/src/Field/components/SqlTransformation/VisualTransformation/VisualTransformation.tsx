import { FC, useCallback } from "react";
import FormControl from "@mui/material/FormControl";
import { Box, Button, IconButton, MenuItem, Select, SelectChangeEvent, TextField } from "@portal/components";
import ClearIcon from "@mui/icons-material/Clear";
import {
  Case,
  DatePart,
  FunctionType,
  SqlFunctionDateAdd,
  SqlFunctionDatePart,
  SqlFunctionReplace,
  SqlFunctionSwitchCase,
  SqlFunctionValue,
  SqlTransformationConfig,
} from "../../../../contexts";
import { ReplaceTransformationFunction } from "./function/ReplaceTransformationFunction";
import { DatePartTransformationFunction } from "./function/DatePartTransformationFunction";
import { DateAddTransformationFunction } from "./function/DateAddTransformationFunction";
import { SwitchCaseTransformationFunction } from "./function/SwitchCaseTransformationFunction";
import { EMPTY_SQL_TRANSFORMATION_FUNCTION } from "../SqlTransformation";
import "./VisualTransformation.scss";

interface VisualTransformationProps {
  data: SqlTransformationConfig;
  onChange: (data: Partial<SqlTransformationConfig>) => void;
}

const functionTypeOptions = Object.values(FunctionType).map((type) => ({ value: type, label: type }));

const getFunctionValueOrDefault = <T extends SqlFunctionValue | null>(functionType: FunctionType, value: T) => {
  return functionType === "REPLACE"
    ? {
        value: {
          oldValue: (value as SqlFunctionReplace)?.oldValue || "default",
          newValue: (value as SqlFunctionReplace)?.newValue || "default",
        },
      }
    : functionType === "DATEPART"
    ? {
        value: {
          part: (value as SqlFunctionDatePart)?.part || DatePart.YEAR,
        },
      }
    : functionType === "DATEADD"
    ? {
        value: {
          part: (value as SqlFunctionDatePart)?.part || DatePart.YEAR,
          number: 0,
        },
      }
    : functionType === "CASE"
    ? {
        value: {
          cases: (value as SqlFunctionSwitchCase)?.cases || [{ id: 1, in: "default", out: "default" }],
        },
      }
    : {};
};

export const VisualTransformation: FC<VisualTransformationProps> = ({ data, onChange }) => {
  const handleAddFunction = useCallback(() => {
    onChange({
      functions: [EMPTY_SQL_TRANSFORMATION_FUNCTION, ...data.functions],
    });
  }, [onChange, data.functions]);

  const handleReset = useCallback(() => {
    onChange({ functions: [EMPTY_SQL_TRANSFORMATION_FUNCTION], canSwitchToVisualMode: true });
  }, []);

  return (
    <>
      <Box mb={1}>
        <Button disabled={!data.canSwitchToVisualMode} variant="text" text="Add function" onClick={handleAddFunction} />
      </Box>
      <Box mb={2}>
        {!data.canSwitchToVisualMode && (
          <Box
            display="flex"
            flexDirection="column"
            gap={1}
            alignItems="center"
            textAlign="center"
            border="1px dashed #999"
            p={4}
          >
            <Box width="70%">Unable to switch to visual mode after SQL is changed in the manual mode.</Box>
            <Button text="Reset to empty" onClick={handleReset} />
          </Box>
        )}
        {data.canSwitchToVisualMode &&
          data.functions.map((func, index) => (
            <Box
              key={index}
              display="flex"
              flexDirection="column"
              gap={1}
              marginTop="-1px"
              className="visual-transformation__function"
            >
              <Box display="flex" gap={1} mb="-1px">
                <Select
                  sx={{ width: "150px" }}
                  variant="outlined"
                  size="small"
                  displayEmpty
                  value={func.type || ""}
                  onChange={(e: SelectChangeEvent) => {
                    const functionType = e.target.value as FunctionType;
                    const currentFunction = data.functions[index];

                    onChange({
                      functions: [
                        ...data.functions.slice(0, index),
                        {
                          ...currentFunction,
                          type: functionType,
                          ...getFunctionValueOrDefault(functionType, currentFunction?.value),
                        },
                        ...data.functions.slice(index + 1, data.functions.length),
                      ],
                    });
                  }}
                >
                  <MenuItem value="" disabled>
                    Please select
                  </MenuItem>
                  {functionTypeOptions.map((func) => (
                    <MenuItem key={func.value} value={func.value}>
                      {func.label}
                    </MenuItem>
                  ))}
                </Select>
                <Box flex={1}>
                  {func.type === "REPLACE" && (
                    <ReplaceTransformationFunction
                      oldValue={(func.value as SqlFunctionReplace)?.oldValue}
                      newValue={(func.value as SqlFunctionReplace)?.newValue}
                      onChange={(oldValue, newValue) =>
                        onChange({
                          functions: [
                            ...data.functions.slice(0, index),
                            {
                              ...data.functions[index],
                              value: { oldValue, newValue },
                            },
                            ...data.functions.slice(index + 1, data.functions.length),
                          ],
                        })
                      }
                    />
                  )}
                  {func.type === "DATEPART" && (
                    <DatePartTransformationFunction
                      part={(func.value as SqlFunctionDatePart)?.part}
                      onChange={(part) =>
                        onChange({
                          functions: [
                            ...data.functions.slice(0, index),
                            {
                              ...data.functions[index],
                              value: { part },
                            },
                            ...data.functions.slice(index + 1, data.functions.length),
                          ],
                        })
                      }
                    />
                  )}
                  {func.type === "DATEADD" && (
                    <DateAddTransformationFunction
                      part={(func.value as SqlFunctionDateAdd)?.part}
                      number={(func.value as SqlFunctionDateAdd)?.number}
                      onChange={(part, number) =>
                        onChange({
                          functions: [
                            ...data.functions.slice(0, index),
                            {
                              ...data.functions[index],
                              value: { part, number },
                            },
                            ...data.functions.slice(index + 1, data.functions.length),
                          ],
                        })
                      }
                    />
                  )}
                </Box>
                <IconButton
                  startIcon={<ClearIcon />}
                  onClick={() =>
                    onChange({
                      functions: [
                        ...data.functions.slice(0, index),
                        ...data.functions.slice(index + 1, data.functions.length),
                      ],
                    })
                  }
                />
              </Box>
              {func.type === "CASE" && (
                <SwitchCaseTransformationFunction
                  cases={(func.value as SqlFunctionSwitchCase)?.cases}
                  onChange={(cases: Case[]) =>
                    onChange({
                      functions: [
                        ...data.functions.slice(0, index),
                        {
                          ...data.functions[index],
                          value: { cases },
                        },
                        ...data.functions.slice(index + 1, data.functions.length),
                      ],
                    })
                  }
                />
              )}
            </Box>
          ))}
      </Box>
      <Box mb={2}>
        <Box fontSize={14} mb={1}>
          SQL Preview
        </Box>
        <FormControl fullWidth>
          <TextField
            fullWidth
            multiline
            disabled
            rows={5}
            size="small"
            sx={{ backgroundColor: "#f9f9f9" }}
            value={data.sql}
          />
        </FormControl>
      </Box>
    </>
  );
};
