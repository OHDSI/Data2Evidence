import React from "react";
import ReactDOMClient from "react-dom/client";
import singleSpaReact from "single-spa-react";
import App from "./App";
import { PortalProps } from "./types/portal";

const lifecycles = singleSpaReact({
  React,
  ReactDOMClient,
  rootComponent: (props: PortalProps) => <App {...props} />,
  errorBoundary: (err, info, props) => {
    // Error boundary for catastrophic errors
    console.error("Notebook Error:", err, info);

    return (
      <div style={{ padding: "20px", color: "red" }}>
        <h2>Notebook Error</h2>
        <p>An error occurred while loading the Notebook application.</p>
        <details>
          <summary>Error Details</summary>
          <pre>{err?.toString()}</pre>
          <pre>{JSON.stringify(info, null, 2)}</pre>
        </details>
      </div>
    );
  },
  domElementGetter: (props: any) => {
    const containerId = props?.containerId;

    if (containerId) {
      const container = document.getElementById(containerId);
      if (container) {
        return container;
      }
      console.warn(
        "[Notebook] Container element not found in DOM:",
        containerId
      );
    }

    console.warn(
      "[Notebook] No containerId provided, using single-spa default"
    );
    return undefined;
  },
});

export const { bootstrap, mount, unmount } = lifecycles;
