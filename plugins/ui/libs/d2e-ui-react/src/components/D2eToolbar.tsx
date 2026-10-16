import type { ReactNode } from "react";
import "./D2eToolbar.scss";

export interface D2eToolbarProps {
  children?: ReactNode;
}

export function D2eToolbar({ children }: D2eToolbarProps) {
  return <div className="d2e-toolbar">{children}</div>;
}

export default D2eToolbar;
