import {
  applyPolyfills,
  defineCustomElements,
} from '@d4l/web-components-library/dist/loader';
import '@d4l/web-components-library/dist/d4l-ui/d4l-ui.css';

// see: https://stenciljs.com/docs/react
// Bind the custom elements to the window object
applyPolyfills().then(() => {
  defineCustomElements();
});

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}