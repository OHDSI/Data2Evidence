import React, { StrictMode } from "react";
import * as ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { App } from "./App";
import { theme } from "./theme";
import { extractDeepLinkParamsFromUrl, saveDeepLinkParams } from "./utils/deepLinkStorage";
import "./webcomponents/registerWebComponents";
import "./index.scss";
import "import-map-overrides";

// Save deep link params BEFORE any redirects happen
// This must run synchronously before React initializes
try {
  const params = extractDeepLinkParamsFromUrl(window.location.href);
  if (Object.keys(params).length > 0) {
    saveDeepLinkParams(params);
  }
} catch (error) {
  console.warn("Failed to save deep link params on initial load:", error);
}

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <StrictMode>
    <BrowserRouter basename="/d2e/portal">
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
