import { ChangeEvent, FC } from "react";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import InfoIcon from "@mui/icons-material/Info";
import { Box, Checkbox, Chip, TextField, Tooltip } from "@portal/components";
import { SqlTransformationConfig, SQLViewMode } from "../../../contexts";
import { VisualTransformation } from "./VisualTransformation/VisualTransformation";
import { SqlFunctionForTransformationState, SqlFunctionValue } from "../../../contexts/states";

interface SqlTransformationProps {
  data: SqlTransformationConfig;
  onChange: (data: Partial<SqlTransformationConfig>) => void;
}

interface FormData extends SqlTransformationConfig {}

export const EMPTY_SQL_TRANSFORMATION_FUNCTION: SqlFunctionForTransformationState<SqlFunctionValue | null> = {
  type: undefined,
  value: null,
};

export const EPMTY_SQL_TRANSFORMATION_FORM_DATA: FormData = {
  isSqlEnabled: true,
  sqlViewMode: "visual",
  canSwitchToVisualMode: true,
  functions: [EMPTY_SQL_TRANSFORMATION_FUNCTION],
  sql: "",
};

const AvailableFunctions = [
  "ABS",
  "CAST",
  "COALESCE",
  "CONCAT",
  "DATEADD",
  "DATEPART",
  "FLOOR",
  "LEFT",
  "LTRIM",
  "LOWER",
  "REPLACE",
  "RIGHT",
  "ROUND",
  "RTRIM",
  "SUBSTRING",
  "UPPER",
];

export const SqlTransformation: FC<SqlTransformationProps> = ({ data, onChange }) => {
  return (
    <Box py={4}>
      <Checkbox
        label="Enabled"
        checked={data.isSqlEnabled}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ isSqlEnabled: e.target.checked })}
      />
      <Box mb={2}>
        <RadioGroup
          row
          name="sqlViewMode"
          value={data.sqlViewMode}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ sqlViewMode: e.target.value as SQLViewMode })}
        >
          <FormControlLabel value="visual" control={<Radio />} label="Visual" />
          <FormControlLabel
            value="manual"
            control={<Radio />}
            label={
              <Box display="flex" gap={1}>
                Manual
                <Tooltip
                  title="Made changes will be shown if you switch from Visual mode to Manual, but not at the opposite."
                  placement="top"
                >
                  <InfoIcon style={{ width: "18px", height: "18px", color: "#999999" }} />
                </Tooltip>
              </Box>
            }
          />
        </RadioGroup>
      </Box>
      {data.sqlViewMode === "visual" && <VisualTransformation data={data} onChange={onChange} />}
      {data.sqlViewMode === "manual" && (
        <>
          <Box mb={2}>
            <Box fontSize={14} mb={1}>
              SQL Statement
            </Box>
            <FormControl fullWidth>
              <TextField
                fullWidth
                multiline
                rows={5}
                size="small"
                value={data.sql}
                onChange={(event) => onChange({ sql: event.target.value })}
              />
            </FormControl>
          </Box>
          <Box>
            <Box fontSize={14} mb={1}>
              Available functions
            </Box>
            <Box display="flex" gap={[2, 0.5]} flexWrap="wrap">
              {AvailableFunctions.map((f) => (
                <Chip key={f} label={f} size="small" variant="filled" color="default" />
              ))}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};
