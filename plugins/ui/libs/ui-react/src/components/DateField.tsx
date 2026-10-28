import { useEffect, useRef, useState } from "react";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Popover from "@mui/material/Popover";
import TextField from "@mui/material/TextField";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import type { PickersCalendarHeaderProps } from "@mui/x-date-pickers/PickersCalendarHeader";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3";
import { addMonths, addYears, format } from "date-fns";
import clsx from "clsx";
import { fromIsoDate, toIsoDate } from "./dateFieldFormat";
import "./Field.scss";
import "./DateField.scss";

// Figma date-picker header: separate month and year controls, each with its own
// ‹ › chevrons and a ▾ that switches into the Month / Year view.
function CalendarHeader(props: PickersCalendarHeaderProps<Date>) {
  const { currentMonth, onMonthChange, onViewChange, view } = props;
  const monthView = view === "month";
  const yearView = view === "year";
  const navDisabled = monthView || yearView;

  const group = (
    label: string,
    active: boolean,
    toView: "month" | "year",
    prev: () => void,
    next: () => void,
  ) => (
    <div className="d2e-datepicker__nav">
      <IconButton size="small" disabled={navDisabled} onClick={prev} aria-label="Previous">
        <ChevronLeftIcon />
      </IconButton>
      <button
        type="button"
        className="d2e-datepicker__switch"
        onClick={() => onViewChange(active ? "day" : toView)}
      >
        {label}
        {active ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
      </button>
      <IconButton size="small" disabled={navDisabled} onClick={next} aria-label="Next">
        <ChevronRightIcon />
      </IconButton>
    </div>
  );

  return (
    <div className="d2e-datepicker__header">
      {group(
        format(currentMonth, "MMM"),
        monthView,
        "month",
        () => onMonthChange(addMonths(currentMonth, -1), "right"),
        () => onMonthChange(addMonths(currentMonth, 1), "left"),
      )}
      {group(
        format(currentMonth, "yyyy"),
        yearView,
        "year",
        () => onMonthChange(addYears(currentMonth, -1), "right"),
        () => onMonthChange(addYears(currentMonth, 1), "left"),
      )}
    </div>
  );
}

export interface DateFieldProps {
  value?: string | null;
  onChange?: (value: string | null) => void;
  label?: string;
  disabled?: boolean;
  min?: string | null;
  max?: string | null;
  ariaLabel?: string;
  clearable?: boolean;
  errorMessages?: string | string[];
  className?: string;
}

// ISO YYYY-MM-DD -> DD/MM/YYYY for display.
function toDisplay(iso: string | null | undefined): string {
  const date = fromIsoDate(iso);
  if (!date) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

export function DateField({
  value = null,
  onChange,
  label,
  disabled = false,
  min = null,
  max = null,
  ariaLabel,
  clearable = false,
  errorMessages,
  className,
}: DateFieldProps) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const messages = Array.isArray(errorMessages)
    ? errorMessages
    : errorMessages
      ? [errorMessages]
      : [];

  // Close the picker if the field becomes disabled while it is open.
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const openPicker = () => {
    if (!disabled) setOpen(true);
  };

  const clear = (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange?.(null);
    setOpen(false);
  };

  // DateCalendar fires onChange for intermediate year/month picks too; only the
  // final day selection ("finish") should dismiss the picker.
  const pick = (
    date: Date | null,
    selectionState?: "partial" | "shallow" | "finish",
  ) => {
    onChange?.(toIsoDate(date));
    if (selectionState === "finish") setOpen(false);
  };

  return (
    <>
      <TextField
        ref={anchorRef}
        className={clsx("d2e-field", "d2e-date-field", className)}
        variant="outlined"
        value={toDisplay(value)}
        label={label}
        disabled={disabled}
        error={messages.length > 0}
        helperText={messages[0]}
        inputProps={{ readOnly: true, "aria-label": ariaLabel }}
        onClick={openPicker}
        onKeyDown={(event) => {
          // Only the input opens the picker on Enter; let Enter on the clear
          // button (or other adornments) trigger its own native activation.
          if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
            event.preventDefault();
            event.stopPropagation();
            openPicker();
          }
        }}
        InputProps={{
          endAdornment:
            clearable && value ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label="Clear date"
                  disabled={disabled}
                  onClick={clear}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
        }}
      />
      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { className: "d2e-datepicker" } }}
      >
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DateCalendar
            value={fromIsoDate(value)}
            disabled={disabled}
            minDate={fromIsoDate(min) ?? undefined}
            maxDate={fromIsoDate(max) ?? undefined}
            views={["year", "month", "day"]}
            openTo="day"
            showDaysOutsideCurrentMonth
            slots={{ calendarHeader: CalendarHeader }}
            onChange={pick}
          />
        </LocalizationProvider>
      </Popover>
    </>
  );
}

export default DateField;
