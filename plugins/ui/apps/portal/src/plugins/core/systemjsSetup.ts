import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ReactDOMClient from "react-dom/client";
import * as ReactJsxRuntime from "react/jsx-runtime";
import * as ReactRouterDOM from "react-router-dom";
import * as EmotionReact from "@emotion/react";

//@ts-ignore
import SystemJS from "systemjs/dist/system-production";

function exposeToPlugin(name: string, component: any) {
  SystemJS.registerDynamic(name, [], true, (_require: any, _exports: any, module: { exports: any }) => {
    module.exports = component;
  });
}

console.log("Setting up SystemJS shared dependencies for plugins...");
exposeToPlugin("react", React);
exposeToPlugin("react-dom", ReactDOM);
exposeToPlugin("react-router-dom", ReactRouterDOM);
exposeToPlugin("@emotion/react", EmotionReact);
exposeToPlugin("react/jsx-runtime", ReactJsxRuntime);
exposeToPlugin("react-dom/client", ReactDOMClient);
