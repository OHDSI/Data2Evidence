import { FC } from "react";
import { Box, MenuItem, Select, SelectChangeEvent, TextField } from "@portal/components";
import { DatePart } from "../../../../../contexts";

interface DateAddTransformationFunctionProps {
  part: string;
  number: number;
  onChange: (part: string, number: any) => void;
}

const datePartOptions = Object.values(DatePart).map((type) => ({ value: type, label: type }));

export const DateAddTransformationFunction: FC<DateAddTransformationFunctionProps> = ({ part, number, onChange }) => {
  return (
    <Box display="flex" gap={1}>
      <Select
        sx={{ width: "154px" }}
        variant="outlined"
        size="small"
        value={part}
        onChange={(e: SelectChangeEvent) => onChange(e.target.value, number)}
      >
        {datePartOptions.map((part) => (
          <MenuItem key={part.value} value={part.value}>
            {part.label}
          </MenuItem>
        ))}
      </Select>
      <Box flex={1}>
        <TextField
          type="number"
          fullWidth
          size="small"
          value={number}
          onChange={(event) => onChange(part, event.target.value)}
        />
      </Box>
    </Box>
  );
};
