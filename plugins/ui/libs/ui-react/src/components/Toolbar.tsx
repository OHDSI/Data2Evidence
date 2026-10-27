import type { ReactNode } from "react";
import "./Toolbar.scss";

export interface ToolbarProps {
  children?: ReactNode;
}

export function Toolbar({ children }: ToolbarProps) {
  return <div className="d2e-toolbar">{children}</div>;
}

export default Toolbar;
