import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SystemAdminPageMetadata } from "@portal/plugin";
import { App, AppProps } from "./App.tsx";
import "./index.css";

const mockMetadata: SystemAdminPageMetadata<void> = {
  system: "Local1",
  userId: "Mock user",
  getToken: () => Promise.resolve("MockToken"),
};

const pageProps: AppProps = {
  metadata: mockMetadata,
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <div
        style={{
          minHeight: 80,
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
