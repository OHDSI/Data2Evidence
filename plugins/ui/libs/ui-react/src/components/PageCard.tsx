import type { ReactNode } from "react";
import "./PageCard.scss";

export interface PageCardProps {
  children?: ReactNode;
  className?: string;
}

export function PageCard({ children, className }: PageCardProps) {
  return (
    <div className={className ? `d2e-page-card ${className}` : "d2e-page-card"}>
      {children}
    </div>
  );
}

export default PageCard;
