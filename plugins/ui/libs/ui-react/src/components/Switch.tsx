import MuiSwitch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import clsx from "clsx";
import { SWITCH_SIZE_MAP, type SwitchSize } from "./switchSizes";
import "./Switch.scss";

export interface SwitchProps {
  checked?: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
  size?: SwitchSize;
  label?: string;
  ariaLabel?: string;
  className?: string;
}

export function Switch({
  checked = false,
  onChange,
  disabled = false,
  size = "md",
  label,
  ariaLabel,
  className,
}: SwitchProps) {
  const spec = SWITCH_SIZE_MAP[size];

  const control = (
    <MuiSwitch
      className={clsx("d2e-switch", `d2e-switch--${size}`, className)}
      checked={checked}
      disabled={disabled}
      color="primary"
      size={spec.mui}
      inputProps={{ "aria-label": ariaLabel }}
      onChange={(event) => onChange?.(event.target.checked)}
    />
  );

  if (label == null) return control;

  return (
    <FormControlLabel
      className="d2e-switch__label-wrap"
      control={control}
      label={label}
      disabled={disabled}
    />
  );
}

export default Switch;
