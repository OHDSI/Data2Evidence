import React, { forwardRef } from "react";
import { default as MuiInputLabel, InputLabelProps as MuiInputLabelProps } from "@mui/material/InputLabel";

export type InputLabelProps = MuiInputLabelProps & {
  shrink?: boolean;
};

const styles = {
  shrink: {
    transform: "scale(0.85)",
  },
};

const InputLabelInternal = (props: InputLabelProps, ref: React.Ref<any>) => {
  return <MuiInputLabel {...props} ref={ref} sx={{ ...props.sx, ...(props.shrink && styles.shrink) }} />;
};

export const InputLabel = forwardRef(InputLabelInternal);
