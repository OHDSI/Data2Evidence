import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SystemAdminPageMetadata } from "@portal/plugin";
import { App, AppProps } from "./App.tsx";
import "./index.css";

export interface MappingMetadataParams {
  mappingSuggestion: boolean;
}

const mockMetadata: SystemAdminPageMetadata<MappingMetadataParams> = {
  system: "Local1",
  userId: "Mock user",
  getToken: () => Promise.resolve("MockToken"),
  data: {
    mappingSuggestion: true,
  },
};

const pageProps: AppProps = {
  metadata: mockMetadata,
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
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
    </BrowserRouter>
  </React.StrictMode>
);
