import { createElement, type ReactNode } from "react";
import { useTruncationTitle } from "../truncation";

export interface TruncatingTextProps {
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  children?: ReactNode;
}

export function TruncatingText({
  as = "span",
  className,
  children,
}: TruncatingTextProps) {
  const ref = useTruncationTitle<HTMLElement>();
  return createElement(as, { ref, className }, children);
}

export default TruncatingText;
