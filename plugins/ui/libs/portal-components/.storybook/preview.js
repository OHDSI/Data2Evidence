import "@fontsource-variable/ibm-plex-sans";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material";
import { applyPolyfills, defineCustomElements } from "@d4l/web-components-library/dist/loader";
import "@d4l/web-components-library/dist/d4l-ui/d4l-ui.css";
import "./fonts.css";

// see: https://stenciljs.com/docs/react
// Bind the custom elements to the window object
applyPolyfills().then(() => {
  defineCustomElements();
});

// Portal app's MUI theme
const theme = createTheme({
  typography: {
    fontFamily:
      '"GT-America", "IBM Plex Sans Variable", "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  },
  palette: {
    text: { primary: "#000080" },
    primary: { main: "#000080" },
  },
});

export const decorators = [(Story) => React.createElement(ThemeProvider, { theme }, React.createElement(Story))];

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};
