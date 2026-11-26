import "@fontsource-variable/ibm-plex-sans";
import React, { StrictMode } from "react";
import * as ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { App } from "./App";
import { theme } from "./theme";
import { NavigationGuardRouter } from "./components/NavigationGuardRouter/NavigationGuardRouter";
import "./webcomponents/registerWebComponents";
import "ui-react/tokens.css";
import "ui-react/style.css";
import "./index.scss";
import "import-map-overrides";
import "./plugins/core/systemjsSetup";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NavigationGuardRouter basename="/d2e/portal">
        <App />
      </NavigationGuardRouter>
    </ThemeProvider>
  </StrictMode>
);
