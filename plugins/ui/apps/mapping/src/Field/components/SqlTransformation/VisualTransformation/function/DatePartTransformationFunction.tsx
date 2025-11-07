import { FC } from "react";
import { Box, MenuItem, Select, SelectChangeEvent } from "@portal/components";
import { DatePart } from "../../../../../contexts";

interface DatePartTransformationFunctionProps {
  part: string;
  onChange: (part: string) => void;
}

const datePartOptions = Object.values(DatePart).map((type) => ({ value: type, label: type }));

export const DatePartTransformationFunction: FC<DatePartTransformationFunctionProps> = ({ part, onChange }) => {
  return (
    <Box display="flex" gap={1}>
      <Select
        sx={{ width: "154px" }}
        variant="outlined"
        size="small"
        value={part}
        onChange={(e: SelectChangeEvent) => onChange(e.target.value)}
      >
        {datePartOptions.map((part) => (
          <MenuItem key={part.value} value={part.value}>
            {part.label}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
};
