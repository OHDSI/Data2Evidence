import type { ReactNode } from "react";
import clsx from "clsx";
import "./PageHeader.scss";

export interface PageHeaderProps {
  /** Page title — Display 2 (26px Light, navy). */
  title: ReactNode;
  /** Small uppercase label with a coral accent dash, e.g. "Admin" (Figma: overline). */
  overline?: ReactNode;
  /** Secondary uppercase label shown after the overline as "· {subOverline}". */
  subOverline?: ReactNode;
  /** Supporting copy below the title — Page Subtitle (13px). */
  description?: ReactNode;
  /**
   * Right-aligned actions — one or more <Button>s, a view toggle, a data-source
   * <Select>, etc. Primary is always the right-most (Figma).
   */
  actions?: ReactNode;
  className?: string;
}

// Page header for portal pages (Admin, Researcher, ETL): an optional overline
// (+ sub-overline), the page title, optional description, and a right-aligned
// actions slot (Figma "Page header").
export function PageHeader({
  title,
  overline,
  subOverline,
  description,
  actions,
  className,
}: PageHeaderProps) {
  const hasOverline = overline != null || subOverline != null;

  return (
    <header className={clsx("d2e-page-header", className)}>
      <div className="d2e-page-header__text">
        <div className="d2e-page-header__heading">
          {hasOverline && (
            <div className="d2e-page-header__overline">
              {overline != null && (
                <span className="d2e-page-header__overline-label">{overline}</span>
              )}
              {subOverline != null && (
                <span className="d2e-page-header__sub-overline">
                  <span aria-hidden="true">·</span>
                  {subOverline}
                </span>
              )}
              <span className="d2e-page-header__accent" aria-hidden="true" />
            </div>
          )}
          <h1 className="d2e-page-header__title">{title}</h1>
        </div>
        {description != null && (
          <p className="d2e-page-header__description">{description}</p>
        )}
      </div>
      {actions != null && <div className="d2e-page-header__actions">{actions}</div>}
    </header>
  );
}

export default PageHeader;
