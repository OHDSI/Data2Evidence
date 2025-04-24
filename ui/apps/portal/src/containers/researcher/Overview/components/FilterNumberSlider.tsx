import React, { ChangeEvent, FC, useCallback, useEffect, useState } from "react";
import { styled } from "@mui/material/styles";
import { Box, InputLabel, Slider, TextInput } from "@portal/components";
import "./FilterNumberSlider.scss";

interface FilterNumberSliderProps {
  label?: string;
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
}

const StyledInputLabel = styled(InputLabel)(() => ({
  transform: "none",
  color: "#000e7e",
}));

const StyledSlider = styled(Slider)(() => ({
  height: "2px",
  margin: "18px 0 24px",

  ".MuiSlider-rail": {
    opacity: 1,
    backgroundColor: "#acaba8",
  },

  ".MuiSlider-track": {
    border: 0,
    backgroundColor: "#acaba8",
  },

  ".MuiSlider-thumbColorPrimary": {
    width: "15px",
    height: "15px",
  },

  ".MuiSlider-valueLabel": {
    top: "50px",
    backgroundColor: "transparent",
    color: "#000080",
    fontSize: "16px",
    fontWeight: "normal",
  },
}));

export const FilterNumberSlider: FC<FilterNumberSliderProps> = ({ label, value: from, onChange, min, max }) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    setValue(from);
  }, [from]);

  const handleValueChange = useCallback(
    (value: number) => {
      setValue(value);
      typeof onChange === "function" && onChange(value);
    },
    [onChange]
  );

  const handleSliderChange = useCallback(
    (e: Event, range: number | number[]) => {
      if (typeof onChange === "function" && typeof range === "number") {
        onChange(range);
      }
    },
    [onChange]
  );

  return (
    <div className="filter-number-slider">
      <Box display="flex" gap={1}>
        {label && <StyledInputLabel>{label}</StyledInputLabel>}
        <TextInput
          type="number"
          label=""
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleValueChange(parseInt(e.target.value))}
        />
      </Box>
      <StyledSlider
        value={from}
        valueLabelFormat={(value: number) => <div>{value}</div>}
        valueLabelDisplay="on"
        onChange={handleSliderChange}
        min={min}
        max={max}
      />
    </div>
  );
};
