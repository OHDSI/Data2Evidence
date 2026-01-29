import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { WizardProvider } from "./context/WizardContext";

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <WizardProvider>
      <App />
    </WizardProvider>
  </React.StrictMode>,
);
