import React, { FC } from "react";
import { Select, SelectProps } from "@portal/components";
import { styled } from "@mui/material/styles";

const StyledSelect = styled(Select)(() => ({
  width: "100%",
  borderRadius: "8px",
  backgroundColor: "white",

  ".MuiSelect-select": {
    padding: "8px 16px",
  },

  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "#979797",
  },

  ".input-placeholder": {
    color: "#9595C8",
  },
}));

export interface FilterSelectProps extends SelectProps {}

export const FilterSelect: FC<FilterSelectProps> = ({ placeholder, ...props }) => {
  return (
    <StyledSelect
      {...props}
      variant="outlined"
      displayEmpty
      renderValue={props.value !== "" ? undefined : () => <span className="input-placeholder">{placeholder}</span>}
    />
  );
};
