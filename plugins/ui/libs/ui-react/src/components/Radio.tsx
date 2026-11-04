import MuiRadio, { type RadioProps as MuiRadioProps } from "@mui/material/Radio";
import MuiRadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import clsx from "clsx";
import { RADIO_SIZE_MAP, type RadioSize } from "./radioSizes";
import "./Radio.scss";

export interface RadioProps extends Omit<MuiRadioProps, "size" | "color"> {
  size?: RadioSize;
  label?: string;
}

export function Radio({ size = "sm", label, className, ...rest }: RadioProps) {
  const spec = RADIO_SIZE_MAP[size];
  const control = (
    <MuiRadio
      className={clsx("d2e-radio", `d2e-radio--${size}`, className)}
      color="primary"
      sx={{
        padding: `${spec.padding}px`,
        "& .MuiSvgIcon-root": { fontSize: `${spec.box}px` },
      }}
      {...rest}
    />
  );

  if (label == null) return control;

  return (
    <FormControlLabel
      className="d2e-radio__label-wrap"
      control={control}
      label={label}
      disabled={rest.disabled}
    />
  );
}

export interface RadioOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  value?: string;
  onChange?: (value: string) => void;
  options: RadioOption[];
  name?: string;
  row?: boolean;
  size?: RadioSize;
  className?: string;
}

export function RadioGroup({
  value,
  onChange,
  options,
  name,
  row = false,
  size = "sm",
  className,
}: RadioGroupProps) {
  return (
    <MuiRadioGroup
      className={clsx("d2e-radio-group", className)}
      value={value ?? ""}
      name={name}
      row={row}
      onChange={(event) => onChange?.(event.target.value)}
    >
      {options.map((option) => (
        <FormControlLabel
          key={option.value}
          className="d2e-radio__label-wrap"
          value={option.value}
          disabled={option.disabled}
          control={<Radio size={size} />}
          label={option.label}
        />
      ))}
    </MuiRadioGroup>
  );
}

export default Radio;
