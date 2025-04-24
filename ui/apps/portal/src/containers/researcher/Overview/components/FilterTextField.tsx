import React, { FC } from "react";
import { styled } from "@mui/material/styles";
import { TextField } from "@portal/components";
import { OutlinedTextFieldProps } from "@mui/material";

const StyledTextField = styled(TextField)({
  backgroundColor: "white",

  ".MuiOutlinedInput-root": {
    borderRadius: "8px",
    lineHeight: "1em",
    padding: "4px 9px",
  },

  ".MuiOutlinedInput-input": {
    height: "1em",
  },

  ".MuiOutlinedInput-notchedOutline": {
    borderColor: "#979797",
  },
});

export interface FilterTextFieldProps extends Omit<OutlinedTextFieldProps, "variant"> {}

export const FilterTextField: FC<FilterTextFieldProps> = (props) => {
  return <StyledTextField {...props} variant="outlined" />;
};
