import React, { forwardRef } from "react";
import { default as MuiTextField, TextFieldProps as MuiTextFieldProps } from "@mui/material/TextField";

export type TextFieldProps = MuiTextFieldProps;

const styles = {
  "& label.Mui-focused": {
    color: "rgba(0, 0, 0, 0.6)",
  },
};

const TextFieldInternal = (props: TextFieldProps, ref: React.Ref<any>) => (
  <MuiTextField {...props} ref={ref} sx={{ ...props.sx, ...styles }} />
);

export const TextField = forwardRef(TextFieldInternal);
