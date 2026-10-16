import Radio, { type RadioProps } from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import clsx from "clsx";
import { RADIO_SIZE_MAP, type D2eRadioSize } from "./radioSizes";
import "./D2eRadio.scss";

export interface D2eRadioProps extends Omit<RadioProps, "size" | "color"> {
  size?: D2eRadioSize;
  label?: string;
}

export function D2eRadio({ size = "sm", label, className, ...rest }: D2eRadioProps) {
  const spec = RADIO_SIZE_MAP[size];
  const control = (
    <Radio
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

export interface D2eRadioOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface D2eRadioGroupProps {
  value?: string;
  onChange?: (value: string) => void;
  options: D2eRadioOption[];
  name?: string;
  row?: boolean;
  size?: D2eRadioSize;
  className?: string;
}

export function D2eRadioGroup({
  value,
  onChange,
  options,
  name,
  row = false,
  size = "sm",
  className,
}: D2eRadioGroupProps) {
  return (
    <RadioGroup
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
          control={<D2eRadio size={size} />}
          label={option.label}
        />
      ))}
    </RadioGroup>
  );
}

export default D2eRadio;
