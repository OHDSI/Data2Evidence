import { D2eAlert, type D2eAlertProps } from "./D2eAlert";

export type D2eAlertBannerProps = Omit<D2eAlertProps, "variant">;

// Full-width, square page banner (Figma "Alert Banner"). Spans its container edge
// to edge with 24px side insets.
export function D2eAlertBanner(props: D2eAlertBannerProps) {
  return <D2eAlert variant="banner" {...props} />;
}

export default D2eAlertBanner;
