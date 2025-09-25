import { createTheme } from "@mui/material";

export const theme_d2e = createTheme({
  typography: {
    fontFamily:
      'GT-America, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  },
  palette: {
    text: {
      primary: "#000080",
    },
    primary: {
      main: "#000080",
    },
  },
  components: {
    MuiTable: {
      styleOverrides: {
        root: {
          backgroundColor: "white",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:nth-of-type(even)": {
            backgroundColor: "#fafafa",
          },
        },
        head: {
          backgroundColor: "#ebf1f8",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: "#ebf1f8",
          fontSize: 16,
          fontWeight: 500,
          color: "#000080",
        },
        body: {
          fontSize: 16,
          color: "#000080",
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 4,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          color: "#000080",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontSize: 16,
          fontWeight: 500,
          textTransform: "none",
          borderRadius: 8,
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
      },
    },
  },
});

export const theme_atlas = createTheme({
  typography: {
    fontFamily:
      'GT-America, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  },
  palette: {
    text: {
      primary: "#1f425a",
    },
    primary: {
      main: "#1f425a",
    },
  },
  components: {
    MuiTable: {
      styleOverrides: {
        root: {
          backgroundColor: "white",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:nth-of-type(even)": {
            backgroundColor: "#fafafa",
          },
        },
        head: {
          backgroundColor: "#ebf1f8",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: "#ebf1f8",
          fontSize: 16,
          fontWeight: 500,
          color: "#1f425a",
        },
        body: {
          fontSize: 16,
          color: "#1f425a",
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 4,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          color: "#1f425a",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontSize: 16,
          fontWeight: 500,
          textTransform: "none",
          borderRadius: 8,
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
      },
    },
  },
});