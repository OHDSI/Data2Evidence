import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Standalone development mode
const root = ReactDOM.createRoot(document.getElementById("root")!);

// Mock props for standalone development
const mockProps = {
  getToken: async () => "mock-jwt-token",
  username: "developer",
  datasetId: "test-dataset-id",
  locale: "en",
  isActiveRoute: true,
  isAtlas: true, // Run in standalone mode
};

root.render(<App {...mockProps} />);
