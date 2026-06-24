import * as React from "react";
import { SVGProps } from "react";

// Severity icons for the Alert. They use `fill="currentColor"` so the parent
// `.alp-alert--{severity}` tints them; a factory builds the four (only path differs).
const createAlertIcon = (d: string) => (props: SVGProps<SVGSVGElement>) =>
  (
    <svg width={24} height={24} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path fill="currentColor" fillRule="evenodd" d={d} />
    </svg>
  );

// Exclamation in a circle
export const AlertErrorIcon = createAlertIcon(
  "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 3a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0V8a1 1 0 0 1 1-1Zm0 8.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z"
);

// Exclamation in a triangle
export const AlertWarningIcon = createAlertIcon(
  "M10.27 3.1a2 2 0 0 1 3.46 0l8.21 14.2A2 2 0 0 1 20.21 20.3H3.79a2 2 0 0 1-1.73-3L10.27 3.1Zm1.73 1 .003.005L3.793 18.3l-.003.005L3.79 18.3h16.42l-.003-.005L12 4.1ZM12 8a1 1 0 0 1 1 1v3.5a1 1 0 1 1-2 0V9a1 1 0 0 1 1-1Zm0 7a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z"
);

// Check in a circle
export const AlertSuccessIcon = createAlertIcon(
  "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm4.7 4.29a1 1 0 0 1 .087 1.32l-.083.094-5.5 5.5a1 1 0 0 1-1.32.083l-.094-.083-2.5-2.5a1 1 0 0 1 1.32-1.498l.094.084L10.5 13.085l4.793-4.792a1 1 0 0 1 1.414 0Z"
);

// "i" in a circle
export const AlertInfoIcon = createAlertIcon(
  "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 6.5a1 1 0 0 1 1 1V16a1 1 0 1 1-2 0v-4.5a1 1 0 0 1 1-1ZM12 6.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z"
);
