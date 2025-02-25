import { FC } from "react";
import { Box, TextField } from "@portal/components";

interface ReplaceTransformationFunctionProps {
  oldValue: string;
  newValue: string;
  onChange: (oldValue: string, newValue: string) => void;
}

export const ReplaceTransformationFunction: FC<ReplaceTransformationFunctionProps> = ({
  oldValue,
  newValue,
  onChange,
}) => {
  return (
    <Box display="flex" gap={1}>
      <TextField fullWidth size="small" value={oldValue} onChange={(event) => onChange(event.target.value, newValue)} />
      <TextField fullWidth size="small" value={newValue} onChange={(event) => onChange(oldValue, event.target.value)} />
    </Box>
  );
};
