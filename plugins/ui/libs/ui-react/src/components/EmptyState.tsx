import type { ReactNode } from "react";
import clsx from "clsx";
import { EmptyStateIllustration } from "./emptyStateIllustration";
import "./EmptyState.scss";

export type EmptyStateSize = "s" | "m" | "l";

export interface EmptyStateProps {
  /** Illustration / icon slot. Defaults to the DS "Data" illustration. */
  icon?: ReactNode;
  /** Optional heading (Figma "Title=on"). */
  title?: ReactNode;
  /** Supporting description. `children` is an alias. */
  description?: ReactNode;
  /** Optional action, e.g. a `<Button variant="secondary">`. */
  action?: ReactNode;
  /** Icon scale: S 90 / M 140 (default) / L 200px. */
  size?: EmptyStateSize;
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = "m",
  className,
  children,
}: EmptyStateProps) {
  const body = description ?? children;

  return (
    <div className={clsx("d2e-empty-state", `d2e-empty-state--${size}`, className)}>
      <div className="d2e-empty-state__icon">
        {icon ?? <EmptyStateIllustration />}
      </div>
      {title || body ? (
        <div className="d2e-empty-state__text">
          {title ? <p className="d2e-empty-state__title">{title}</p> : null}
          {body ? <p className="d2e-empty-state__description">{body}</p> : null}
        </div>
      ) : null}
      {action ? <div className="d2e-empty-state__action">{action}</div> : null}
    </div>
  );
}

export default EmptyState;
