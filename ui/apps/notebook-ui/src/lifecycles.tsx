import React from "react";
import ReactDOMClient from "react-dom/client";
import singleSpaReact from "single-spa-react";
import App from "./App";
import { PortalProps } from "./types/portal";

const lifecycles = singleSpaReact({
  React,
  ReactDOMClient,
  rootComponent: (props: PortalProps) => <App {...props} />,
  errorBoundary: (_err, _info, _props) => {
    // Customize the root error boundary for your microfrontend here.
    return <div>An error occurred in the Notebook application</div>;
  },
});

export const { bootstrap, mount, unmount } = lifecycles;
