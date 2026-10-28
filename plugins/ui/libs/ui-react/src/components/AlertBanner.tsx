import { Alert, type AlertProps } from "./Alert";

export type AlertBannerProps = Omit<AlertProps, "variant">;

// Full-width, square page banner (Figma "Alert Banner"). Spans its container edge
// to edge with 24px side insets.
export function AlertBanner(props: AlertBannerProps) {
  return <Alert variant="banner" {...props} />;
}

export default AlertBanner;
