/* eslint-disable */
// import { defineCustomElements, JSX as LocalJSX } from 'stencil-library/dist/loader';
import { applyPolyfills, defineCustomElements, JSX as LocalJSX } from "@d4l/web-components-library/dist/loader";
import { HTMLAttributes } from "react";
import "@d4l/web-components-library/dist/d4l-ui/d4l-ui.css";

type StencilToReact<T> = {
  [P in keyof T]?: T[P] &
    Omit<HTMLAttributes<Element>, "className"> & {
      class?: string;
    };
};

declare global {
  export namespace JSX {
    interface IntrinsicElements extends StencilToReact<LocalJSX.IntrinsicElements> {}
  }
}

if (typeof window !== "undefined") {
  applyPolyfills().then(() => {
    defineCustomElements(window);
  });
}
