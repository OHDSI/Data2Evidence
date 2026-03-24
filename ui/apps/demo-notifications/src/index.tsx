import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <App
    appId="demo-notifications"
    datasetId="demo-dataset-001"
    username="dev-user"
    locale="en"
    autoMount={true}
  />
);
