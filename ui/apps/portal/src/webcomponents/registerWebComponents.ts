/* eslint-disable */
import {
  applyPolyfills,
  defineCustomElements,
} from "@d4l/web-components-library/dist/loader";
import "@d4l/web-components-library/dist/d4l-ui/d4l-ui.css";

if (typeof window !== "undefined") {
  applyPolyfills().then(() => {
    defineCustomElements(window);
  });
}
