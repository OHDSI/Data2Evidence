import React from "react";
import ReactDOM from "react-dom/client";
import { SystemAdminPageMetadata } from "@portal/plugin";
import { App, AppProps } from "./App.tsx";
import { AppState, initialState } from "./contexts/index.ts";
import "./index.css";

export interface MappingMetadataParams {
  mappingSuggestion: boolean;
  data: AppState;
  onChange: (data: any) => void;
}

const mockMetadata: SystemAdminPageMetadata<MappingMetadataParams> = {
  system: "Local1",
  userId: "Mock user",
  getToken: () => Promise.resolve("MockToken"),
  data: {
    mappingSuggestion: true,
    data: initialState,
    onChange: () => {},
  },
};

const pageProps: AppProps = {
  metadata: mockMetadata,
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div
      style={{
        minHeight: 56,
        background: "#fbfbfd",
        boxShadow: "0 .5px 8px 0 #acaba8",
        fontSize: 24,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
      }}
    >
      Portal Header
    </div>
    <App {...pageProps} />
  </React.StrictMode>
);
