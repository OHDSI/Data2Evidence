import React, { FC } from "react";
import { InputLabel, InputLabelProps } from "@portal/components";
import { styled } from "@mui/material/styles";

const StyledInputLabel = styled(InputLabel)(() => ({
  marginBottom: "8px",
  transform: "none",
  fontSize: "18px",
  fontWeight: 500,
  color: "#000080",
}));

export interface FilterInputLabel extends InputLabelProps {}

export const FilterInputLabel: FC<InputLabelProps> = (props) => {
  return <StyledInputLabel {...props} />;
};
