import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import clsx from "clsx";
import { CHECKBOX_SIZE_MAP } from "./checkboxSizes";
import type { D2eCheckboxSize } from "./checkboxSizes";
import "./D2eCheckbox.scss";

export interface D2eCheckboxProps {
  checked?: boolean;
  onChange?: (value: boolean) => void;
  indeterminate?: boolean;
  label?: string;
  disabled?: boolean;
  size?: D2eCheckboxSize;
  ariaLabel?: string;
  className?: string;
}

export function D2eCheckbox({
  checked = false,
  onChange,
  indeterminate = false,
  label,
  disabled = false,
  size = "sm",
  ariaLabel,
  className,
}: D2eCheckboxProps) {
  const spec = CHECKBOX_SIZE_MAP[size];

  const control = (
    <Checkbox
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

export default D2eCheckbox;
