import React from "react";
import ReactDOMClient from "react-dom/client";
import singleSpaReact from "single-spa-react";
import App from "./App";
import { PortalProps } from "./types/portal";
import { normalizeWizardPortalProps } from "./utils/portalProps";

const lifecycles = singleSpaReact({
  React,
  ReactDOMClient,
  rootComponent: (props: PortalProps) => <App {...normalizeWizardPortalProps(props)} />,
  errorBoundary: (err, info) => {
    console.error("[Wizards] Error:", err, info);

    return (
      <div style={{ padding: "20px", color: "red" }}>
        <h2>Wizards Error</h2>
        <p>An error occurred while loading the Wizards application.</p>
        <details>
          <summary>Error Details</summary>
          <pre>{err?.toString()}</pre>
          <pre>{JSON.stringify(info, null, 2)}</pre>
        </details>
      </div>
    );
  },
  domElementGetter: (props: any): HTMLElement => {
    if (props?.domElement) {
      return props.domElement;
    }

    const containerId = props?.containerId;

    if (containerId) {
      const container = document.getElementById(containerId);
      if (container) {
        return container;
      }
      console.warn("[Wizards] Container element not found in DOM:", containerId);
    }

    console.warn("[Wizards] No containerId provided, using single-spa default");
    return undefined;
  },
});

export const { bootstrap, mount, unmount, update } = lifecycles;
