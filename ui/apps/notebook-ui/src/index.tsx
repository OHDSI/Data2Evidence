import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PortalProps } from "./types";

// Standalone development mode
const root = ReactDOM.createRoot(document.getElementById("root")!);

// Mock props for standalone development
const mockProps: PortalProps = {
  getToken: async () => "mock-jwt-token",
  username: "developer",
  datasetId: "test-dataset-id",
  locale: "en",
  isAtlas: true, // Run in standalone mode
};

root.render(<App {...mockProps} />);
