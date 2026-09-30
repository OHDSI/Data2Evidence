import { InputAdornment, MenuItem, SvgIcon, TextField, ThemeProvider, alpha, createTheme } from "@mui/material";

export interface DataSourceOption {
  value: string;
  label: string;
}

interface DataSourceSelectProps {
  options: DataSourceOption[];
  value: string;
  /** Text shown when there is no value, e.g. while the sources load. */
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

// Values from the D2E design tokens (libs/d2e-ui/src/tokens/tokens.css), so the
// field matches D2eSelect, the Vue control that Data Exploration uses.
const TOKENS = {
  primaryLight: "#333399",
  neutralBlack: "#000000",
  neutral: "#595757",
  neutralLight: "#ACABA8",
  radiusMd: 8,
  // D2eSelect size "md". It matches the 48px search box and view toggle beside it.
  fieldHeight: 48,
  minWidth: 208,
  spacingXxs: 4,
  fontFamily:
    '"IBM Plex Sans Variable", "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
} as const;

// The Vuetify list states that D2eSelect's menu uses, measured in Data
// Exploration: the row text, and an overlay of the text colour at these
// opacities. The selected row takes the theme primary; states add together.
const MENU = {
  primary: "#000080",
  itemTextOpacity: 0.87,
  hoverOpacity: 0.04,
  activatedOpacity: 0.12,
  focusOpacity: 0.12,
} as const;

const itemOverlay = (opacity: number) => alpha(TOKENS.neutralBlack, MENU.itemTextOpacity * opacity);

const LABEL = "Data source";

const theme = createTheme({
  palette: {
    primary: { main: TOKENS.primaryLight },
    text: { primary: TOKENS.neutralBlack, secondary: TOKENS.neutral },
  },
  shape: { borderRadius: TOKENS.radiusMd },
  typography: { fontFamily: TOKENS.fontFamily },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          height: TOKENS.fieldHeight,
          fontSize: 16,
          "& .MuiOutlinedInput-notchedOutline, &:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: TOKENS.neutralLight,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: TOKENS.primaryLight,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { color: TOKENS.neutral, "&.Mui-focused": { color: TOKENS.primaryLight } },
      },
    },
    MuiSelect: {
      styleOverrides: { icon: { color: TOKENS.neutral } },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: alpha(TOKENS.neutralBlack, MENU.itemTextOpacity),
          "&:hover": { backgroundColor: itemOverlay(MENU.hoverOpacity) },
          "&.Mui-focusVisible": { backgroundColor: itemOverlay(MENU.focusOpacity) },
          // MUI marks the selected item focus-visible whenever the menu opens, also
          // on a mouse click. Vuetify shows no focus overlay then, so the selected
          // row keeps the activated tint. The hover rule comes last, so it wins.
          "&.Mui-selected, &.Mui-selected.Mui-focusVisible": {
            color: MENU.primary,
            backgroundColor: alpha(MENU.primary, MENU.activatedOpacity),
          },
          "&.Mui-selected:hover": {
            backgroundColor: alpha(MENU.primary, MENU.activatedOpacity + MENU.hoverOpacity),
          },
        },
      },
    },
  },
});

// Material Design Icons "database-outline", the icon Data Exploration shows.
function DatabaseOutlineIcon() {
  return (
    <SvgIcon sx={{ color: TOKENS.neutral }}>
      <path d="M12,3C7.58,3 4,4.79 4,7V17C4,19.21 7.59,21 12,21C16.41,21 20,19.21 20,17V7C20,4.79 16.42,3 12,3M18,17C18,17.5 15.87,19 12,19C8.13,19 6,17.5 6,17V14.77C7.61,15.55 9.72,16 12,16C14.28,16 16.39,15.55 18,14.77V17M18,12.45C16.7,13.4 14.42,14 12,14C9.58,14 7.3,13.4 6,12.45V9.64C7.47,10.47 9.61,11 12,11C14.39,11 16.53,10.47 18,9.64V12.45M12,9C8.13,9 6,7.5 6,7C6,6.5 8.13,5 12,5C15.87,5 18,6.5 18,7C18,7.5 15.87,9 12,9Z" />
    </SvgIcon>
  );
}

const startAdornment = (
  <InputAdornment position="start" sx={{ marginRight: `${TOKENS.spacingXxs}px` }}>
    <DatabaseOutlineIcon />
  </InputAdornment>
);

/**
 * The current Atlas data source as a read-only field, styled like DataSourceSelect.
 */
export function DataSourceField({ sourceName }: { sourceName: string }) {
  return (
    <ThemeProvider theme={theme}>
      <TextField
        label={LABEL}
        value={sourceName}
        size="small"
        sx={{ minWidth: TOKENS.minWidth }}
        InputLabelProps={{ shrink: true }}
        InputProps={{ readOnly: true, startAdornment }}
        inputProps={{ "aria-label": LABEL }}
      />
    </ThemeProvider>
  );
}

/**
 * The Atlas data source selector, styled like D2eSelect in Data Exploration.
 */
export function DataSourceSelect({ options, value, placeholder, onChange, disabled = false }: DataSourceSelectProps) {
  return (
    <ThemeProvider theme={theme}>
      <TextField
        select
        label={LABEL}
        value={options.some((option) => option.value === value) ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        size="small"
        sx={{ minWidth: TOKENS.minWidth }}
        InputLabelProps={{ shrink: true }}
        InputProps={{ startAdornment }}
        SelectProps={{
          displayEmpty: true,
          renderValue: (selected) =>
            options.find((option) => option.value === selected)?.label ?? (
              <span style={{ color: TOKENS.neutral }}>{placeholder}</span>
            ),
          inputProps: { "aria-label": LABEL },
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    </ThemeProvider>
  );
}
