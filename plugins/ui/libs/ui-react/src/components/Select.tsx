import Autocomplete from "@mui/material/Autocomplete";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import clsx from "clsx";
import { SELECT_SIZE_MAP } from "./selectSizes";
import type { SelectItem, SelectSize } from "./selectSizes";
import { resolveIcon, type Icon } from "./internal/icon";
import "./Field.scss";
import "./Select.scss";

type SelectValue = string | string[] | null;

export interface SelectProps {
  value?: SelectValue;
  onChange?: (value: SelectValue) => void;
  items?: SelectItem[];
  label?: string;
  placeholder?: string;
  size?: SelectSize;
  disabled?: boolean;
  multiple?: boolean;
  errorMessages?: string | string[];
  hint?: string;
  prependIcon?: Icon;
  /** Switches to an autocomplete so the user can type to filter the options. */
  searchable?: boolean;
  className?: string;
}

export function Select({
  value,
  onChange,
  items = [],
  label,
  placeholder,
  size = "sm",
  disabled = false,
  multiple = false,
  errorMessages,
  hint,
  prependIcon,
  searchable = false,
  className,
}: SelectProps) {
  const spec = SELECT_SIZE_MAP[size];
  const messages = Array.isArray(errorMessages)
    ? errorMessages
    : errorMessages
      ? [errorMessages]
      : [];
  const error = messages.length > 0;
  const helperText = error ? messages[0] : hint;
  const rootClass = clsx("d2e-field", "d2e-select", `d2e-select--${size}`, className);
  const rootStyle = { "--d2e-select-height": `${spec.height}px` } as React.CSSProperties;

  const adornment = prependIcon
    ? {
        startAdornment: (
          <InputAdornment position="start" className="d2e-select__adornment">
            {resolveIcon(prependIcon, { fontSize: 24 })}
          </InputAdornment>
        ),
      }
    : undefined;

  if (searchable) {
    const selectedValues = multiple
      ? items.filter((item) => Array.isArray(value) && value.includes(item.value))
      : (items.find((item) => item.value === value) ?? null);

    return (
      <Autocomplete
        className={rootClass}
        style={rootStyle}
        multiple={multiple}
        disabled={disabled}
        options={items}
        value={selectedValues as never}
        getOptionLabel={(option) => (option as SelectItem).label}
        getOptionDisabled={(option) => (option as SelectItem).disabled === true}
        isOptionEqualToValue={(option, selected) =>
          (option as SelectItem).value === (selected as SelectItem).value
        }
        onChange={(_event, next) => {
          if (multiple) {
            onChange?.((next as SelectItem[]).map((item) => item.value));
          } else {
            onChange?.((next as SelectItem | null)?.value ?? null);
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            error={error}
            helperText={helperText}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  {adornment?.startAdornment}
                  {params.InputProps.startAdornment}
                </>
              ),
            }}
          />
        )}
      />
    );
  }

  const selectValue = value ?? (multiple ? [] : "");

  return (
    <TextField
      className={rootClass}
      style={rootStyle}
      select
      variant="outlined"
      value={selectValue}
      onChange={(event) => onChange?.(event.target.value as SelectValue)}
      label={label}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      helperText={helperText}
      SelectProps={{
        multiple,
        displayEmpty: Boolean(placeholder),
        renderValue: (selected) => {
          const arr = Array.isArray(selected)
            ? selected
            : selected !== "" && selected != null
              ? [selected]
              : [];
          if (!arr.length)
            return placeholder ? (
              <span style={{ color: "rgba(0,0,0,0.38)" }}>{placeholder}</span>
            ) : null;
          if (multiple)
            return (
              <div className="d2e-select__chips">
                {arr.map((v) => (
                  <Chip
                    key={v}
                    label={items.find((i) => i.value === v)?.label ?? v}
                    onMouseDown={(event) => event.stopPropagation()}
                    onDelete={
                      disabled
                        ? undefined
                        : () => onChange?.(arr.filter((x) => x !== v))
                    }
                  />
                ))}
              </div>
            );
          return items.find((i) => i.value === arr[0])?.label ?? arr[0];
        },
      }}
      InputLabelProps={{ shrink: placeholder ? true : undefined }}
      InputProps={adornment}
    >
      {items.map((item) => {
        const checked =
          multiple && Array.isArray(value) && value.includes(item.value);
        return (
          <MenuItem key={item.value} value={item.value} disabled={item.disabled}>
            {multiple ? (
              <>
                <Checkbox
                  checked={checked}
                  color="primary"
                  size="small"
                  sx={{ marginInlineStart: "-6px", marginInlineEnd: "4px" }}
                />
                <ListItemText primary={item.label} sx={{ my: 0 }} />
              </>
            ) : (
              item.label
            )}
          </MenuItem>
        );
      })}
    </TextField>
  );
}

export default Select;
