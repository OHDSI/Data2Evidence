import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ReactDOMClient from "react-dom/client";
import * as ReactJsxRuntime from "react/jsx-runtime";
import * as ReactRouterDOM from "react-router-dom";
import * as EmotionReact from "@emotion/react";

//@ts-ignore
import SystemJS from "systemjs/dist/system-production";

// Vite nests a CJS module's real exports under `.default`, whereas CRA/webpack
// hoisted them to the top level. Plugins that import named exports (e.g. the
// Vite-built flow plugin's `import { jsx } from "react/jsx-runtime"`) need them
// at the top level, so re-expose default's members there while keeping .default.
function flattenDefault(ns: any) {
  const def = ns?.default;
  if (def && (typeof def === "object" || typeof def === "function")) {
    return Object.assign({}, def, ns);
  }
  return ns;
}

function exposeToPlugin(name: string, component: any) {
  const value = flattenDefault(component);
  // register (not registerDynamic) + bulk _export so each member is a real
  // top-level named export; registerDynamic only exposes `default`, which
  // breaks plugins importing named exports.
  SystemJS.register(name, [], (_export: any) => ({
    setters: [],
    execute() {
      _export(value);
      if (!("default" in value)) _export("default", value);
    },
  }));
}

console.log("Setting up SystemJS shared dependencies for plugins...");
exposeToPlugin("react", React);
exposeToPlugin("react-dom", ReactDOM);
exposeToPlugin("react-router-dom", ReactRouterDOM);
exposeToPlugin("@emotion/react", EmotionReact);
exposeToPlugin("react/jsx-runtime", ReactJsxRuntime);
exposeToPlugin("react-dom/client", ReactDOMClient);
