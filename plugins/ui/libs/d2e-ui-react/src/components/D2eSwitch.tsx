import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import clsx from "clsx";
import { SWITCH_SIZE_MAP, type D2eSwitchSize } from "./switchSizes";
import "./D2eSwitch.scss";

export interface D2eSwitchProps {
  checked?: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
  size?: D2eSwitchSize;
  label?: string;
  ariaLabel?: string;
  className?: string;
}

export function D2eSwitch({
  checked = false,
  onChange,
  disabled = false,
  size = "md",
  label,
  ariaLabel,
  className,
}: D2eSwitchProps) {
  const spec = SWITCH_SIZE_MAP[size];

  const control = (
    <Switch
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

export default D2eSwitch;
