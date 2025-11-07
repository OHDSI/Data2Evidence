import React, { forwardRef } from "react";
import { default as MuiFormControl, FormControlProps as MuiFormControlProps } from "@mui/material/FormControl";

export type FormControlProps = MuiFormControlProps;

const FormControlInternal = (props: FormControlProps, ref: React.Ref<any>) => <MuiFormControl {...props} ref={ref} />;

export const FormControl = forwardRef(FormControlInternal);
