import { BoxProps as MuiBoxProps } from "@mui/material/Box";

export type BoxProps = MuiBoxProps;

// Re-export MUI Box directly to avoid complex type resolution
export { default as Box } from "@mui/material/Box";
