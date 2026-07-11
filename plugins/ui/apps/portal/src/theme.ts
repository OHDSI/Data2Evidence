import { createTheme } from "@mui/material";

// Extend the MUI theme to include custom palette colors
declare module "@mui/material/styles" {
  interface Palette {
    custom: {
      selectedRowBorder: string;
      tableHeaderBg: string;
      alternateRowBg: string;
      treeMapLegendColor: string[];
    };
  }
  interface PaletteOptions {
    custom?: {
      selectedRowBorder?: string;
      tableHeaderBg?: string;
      alternateRowBg?: string;
      treeMapLegendColor?: string[];
    };
  }
}

export const theme = createTheme({
  typography: {
    fontFamily:
      '"GT-America", "IBM Plex Sans Variable", "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  },
  palette: {
    background: {
      default: "#f2f0f1",
    },
    text: {
      primary: "#000080",
    },
    primary: {
      main: "#000080",
    },
    custom: {
      selectedRowBorder: "#FDA2A2",
      tableHeaderBg: "#edf2f7",
      alternateRowBg: "#fafafa",
      treeMapLegendColor: ["#edf2f7", "#8499E6"],
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
          color: "#555555",
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
  },
});
