import TextField from "@mui/material/TextField";
import type { TextFieldProps as MuiTextFieldProps } from "@mui/material/TextField";
import clsx from "clsx";
import "./D2eField.scss";
import "./D2eTextField.scss";

type ForwardedProps = Omit<
  MuiTextFieldProps,
  | "value"
  | "onChange"
  | "label"
  | "required"
  | "error"
  | "helperText"
  | "placeholder"
  | "variant"
  | "autoFocus"
>;

export interface D2eTextFieldProps extends ForwardedProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  required?: boolean;
  errorMessages?: string | string[];
  maxlength?: number | string;
  placeholder?: string;
  autofocus?: boolean;
  hideDetails?: boolean | "auto";
}

export function D2eTextField({
  value,
  onChange,
  label,
  required = false,
  errorMessages,
  maxlength,
  placeholder,
  autofocus = false,
  hideDetails = "auto",
  className,
  inputProps,
  ...rest
}: D2eTextFieldProps) {
  const messages = Array.isArray(errorMessages)
    ? errorMessages
    : errorMessages
      ? [errorMessages]
      : [];
  // true hides the details area; false / "auto" show messages[0] (which is
  // undefined when there is no error, so "auto" only shows on error).
  const helperText = hideDetails === true ? undefined : messages[0];

  return (
    <TextField
      className={clsx("d2e-field", "d2e-text-field", className)}
      variant="outlined"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      label={label}
      required={required}
      error={messages.length > 0}
      helperText={helperText}
      placeholder={placeholder}
      autoFocus={autofocus}
      inputProps={{
        ...(maxlength != null ? { maxLength: Number(maxlength) } : {}),
        ...inputProps,
      }}
      {...rest}
    />
  );
}

export default D2eTextField;
