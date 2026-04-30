import { JSX as LocalJSX } from "@d4l/web-components-library/dist/loader";
import { HTMLAttributes } from "react";

type StencilToReact<T> = {
  [P in keyof T]?: T[P] &
    Omit<HTMLAttributes<Element>, "className"> & {
      class?: string;
    };
};

type SqlScratchpadAttributes = {
  'api-url': string;
  'dialect': string;
  'ref': React.RefObject<HTMLDivElement>;
}

type SqlScratchpad<T> = Partial<T & HTMLAttributes<T> & { children: any }>;

type StencilIntrinsicElements = StencilToReact<LocalJSX.IntrinsicElements> & {
  'sql-scratchpad': SqlScratchpad<SqlScratchpadAttributes>;
};

declare global {
  namespace JSX {
    interface IntrinsicElements extends StencilIntrinsicElements {}
  }
}
