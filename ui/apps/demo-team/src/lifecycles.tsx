import React from "react";
import ReactDOMClient from "react-dom/client";
import singleSpaReact from "single-spa-react";
import App from "./App";
import { PortalProps } from "./types";

const lifecycles = singleSpaReact({
  React,
  ReactDOMClient,
  rootComponent: (props: PortalProps) => <App {...props} />,
  errorBoundary: (err, info) => {
    console.error("[Demo Team] Error:", err, info);
    return (
      <div style={{ padding: "20px", color: "red" }}>
        <h2>Demo Team Error</h2>
        <p>An error occurred while loading the Demo Team application.</p>
        <details>
          <summary>Error Details</summary>
          <pre>{err?.toString()}</pre>
          <pre>{JSON.stringify(info, null, 2)}</pre>
        </details>
      </div>
    );
  },
  domElementGetter: (props: any): HTMLElement => {
    const containerId = props?.containerId;
    if (containerId) {
      const container = document.getElementById(containerId);
      if (container) {
        return container;
      }
      console.warn("[Demo Team] Container element not found:", containerId);
    }
    console.warn("[Demo Team] No containerId provided, using single-spa default");
    return undefined as any;
  },
});

export const { bootstrap, mount, unmount } = lifecycles;
