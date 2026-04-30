import { JSX as LocalJSX } from "@d4l/web-components-library/dist/loader";
import { HTMLAttributes } from "react";

type StencilToReact<T> = {
  [P in keyof T]?: T[P] &
    Omit<HTMLAttributes<Element>, "className"> & {
      class?: string;
    };
};

type StencilIntrinsicElements = StencilToReact<LocalJSX.IntrinsicElements>;

declare global {
  namespace JSX {
    interface IntrinsicElements extends StencilIntrinsicElements {}
  }
}
