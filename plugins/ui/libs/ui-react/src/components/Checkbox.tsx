import MuiCheckbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import clsx from "clsx";
import { CHECKBOX_SIZE_MAP } from "./checkboxSizes";
import type { CheckboxSize } from "./checkboxSizes";
import "./Checkbox.scss";

export interface CheckboxProps {
  checked?: boolean;
  onChange?: (value: boolean) => void;
  indeterminate?: boolean;
  label?: string;
  disabled?: boolean;
  size?: CheckboxSize;
  ariaLabel?: string;
  className?: string;
}

export function Checkbox({
  checked = false,
  onChange,
  indeterminate = false,
  label,
  disabled = false,
  size = "sm",
  ariaLabel,
  className,
}: CheckboxProps) {
  const spec = CHECKBOX_SIZE_MAP[size];

  const control = (
    <MuiCheckbox
      className={clsx("d2e-checkbox", `d2e-checkbox--${size}`, className)}
      checked={checked}
      indeterminate={indeterminate}
      disabled={disabled}
      color="primary"
      inputProps={{ "aria-label": ariaLabel }}
      onChange={(event) => onChange?.(event.target.checked)}
      sx={{
        padding: `${spec.padding}px`,
        "& .MuiSvgIcon-root": { fontSize: `${spec.box}px` },
      }}
    />
  );

  if (label == null) return control;

  return (
    <FormControlLabel
      className="d2e-checkbox__label-wrap"
      control={control}
      label={label}
      disabled={disabled}
    />
  );
}

export default Checkbox;
