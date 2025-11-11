import React from "react";
import ReactDOMClient from "react-dom/client";
import singleSpaReact from "single-spa-react";
import { FlowApp } from "./FlowApp";
import { PortalProps } from "./types/portal";

const lifecycles = singleSpaReact({
  React,
  ReactDOMClient,
  rootComponent: (props: PortalProps) => {
    return <FlowApp {...props} />;
  },
  errorBoundary: (err, info, props) => {
    // Error boundary for catastrophic errors
    console.error("Analysis Flow Error:", err, info);

    return (
      <div style={{ padding: "20px", color: "red" }}>
        <h2>Analysis Flow Error</h2>
        <p>An error occurred while loading the Analysis Flow application.</p>
        <details>
          <summary>Error Details</summary>
          <pre>{err?.toString()}</pre>
          <pre>{JSON.stringify(info, null, 2)}</pre>
        </details>
      </div>
    );
  },
});

export const { bootstrap, mount, unmount } = lifecycles;
