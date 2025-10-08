/* eslint-disable */
// import { defineCustomElements, JSX as LocalJSX } from 'stencil-library/dist/loader';
import { applyPolyfills, defineCustomElements } from "@d4l/web-components-library/dist/loader";
import "@d4l/web-components-library/dist/d4l-ui/d4l-ui.css";

if (typeof window !== "undefined") {
  applyPolyfills().then(() => {
    defineCustomElements(window);
  });
}
