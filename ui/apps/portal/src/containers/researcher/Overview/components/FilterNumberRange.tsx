import React, { ChangeEvent, FC, useCallback, useEffect, useState } from "react";
import { styled } from "@mui/material/styles";
import { Box, InputLabel, Slider, TextInput } from "@portal/components";
import "./FilterNumberRange.scss";

interface FilterNumberRangeProps {
  label?: string;
  from: number;
  to: number;
  onChange?: (from: number, to: number) => void;
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

export const FilterNumberRange: FC<FilterNumberRangeProps> = ({ label, from, to, onChange, min, max }) => {
  const [fromValue, setFromValue] = useState(0);
  const [toValue, setToValue] = useState(0);

  useEffect(() => {
    setFromValue(from);
    setToValue(to);
  }, [from, to]);

  const handleFromChange = useCallback(
    (from: number) => {
      setFromValue(from);
      typeof onChange === "function" && onChange(from, toValue);
    },
    [onChange, toValue]
  );

  const handleToChange = useCallback(
    (to: number) => {
      setToValue(to);
      typeof onChange === "function" && onChange(fromValue, to);
    },
    [onChange, fromValue]
  );

  const handleSliderChange = useCallback(
    (e: Event, range: number | number[]) => {
      if (typeof onChange === "function" && Array.isArray(range) && range.length === 2) {
        onChange(range[0], range[1]);
      }
    },
    [onChange]
  );

  return (
    <div className="filter-number-range">
      <Box display="flex" gap={1}>
        {label && <StyledInputLabel>{label}</StyledInputLabel>}
        <TextInput
          type="number"
          label=""
          value={fromValue}
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleFromChange(parseInt(e.target.value))}
        />
        <span>to</span>
        <TextInput
          type="number"
          label=""
          value={toValue}
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleToChange(parseInt(e.target.value))}
        />
      </Box>
      <StyledSlider
        value={[from, to]}
        valueLabelFormat={(value: number, index: number) => <div>{value}</div>}
        valueLabelDisplay="on"
        onChange={handleSliderChange}
        min={min}
        max={max}
      />
    </div>
  );
};
