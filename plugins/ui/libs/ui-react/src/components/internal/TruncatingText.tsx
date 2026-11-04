import * as React from "react";
import { useTruncationTitle } from "../truncation";

export interface TruncatingTextProps {
  // React 19's types drop the global `JSX` namespace; use the React-scoped one
  // so emitted declarations resolve for both React 18 and 19 consumers.
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  children?: React.ReactNode;
}

export function TruncatingText({
  as = "span",
  className,
  children,
}: TruncatingTextProps) {
  const ref = useTruncationTitle<HTMLElement>();
  return React.createElement(as, { ref, className }, children);
}

export default TruncatingText;
