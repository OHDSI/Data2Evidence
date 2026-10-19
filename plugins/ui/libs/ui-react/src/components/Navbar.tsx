import type { MouseEvent, ReactNode } from "react";
import clsx from "clsx";
import "./Navbar.scss";

/**
 * "next" is the Aug-2026 redesign (navy links, coral underline when selected) —
 * the default and the permanent target. "classic" is the current portal navbar
 * (grey links, thick navy bar when active); kept until the migration lands.
 */
export type NavbarVariant = "classic" | "next";

export interface NavbarProps {
  variant?: NavbarVariant;
  /** Left slot — the product logo. */
  logo?: ReactNode;
  /** Right slot — e.g. a dataset selector, icons, or the account menu. */
  end?: ReactNode;
  /** The nav links — typically <NavItem>s. */
  children?: ReactNode;
  className?: string;
}

export function Navbar({ variant = "next", logo, end, children, className }: NavbarProps) {
  return (
    <nav className={clsx("d2e-navbar", `d2e-navbar--${variant}`, className)}>
      {logo != null && <div className="d2e-navbar__logo">{logo}</div>}
      <div className="d2e-navbar__nav">{children}</div>
      {end != null && <div className="d2e-navbar__end">{end}</div>}
    </nav>
  );
}

export interface NavItemProps {
  selected?: boolean;
  disabled?: boolean;
  /** Renders an <a>; omit for a <button>. */
  href?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  children: ReactNode;
  className?: string;
}

// A single nav link. Visual state (default/hover/selected/disabled) is driven by
// the parent Navbar's variant class, so the markup stays identical across styles.
export function NavItem({
  selected = false,
  disabled = false,
  href,
  onClick,
  children,
  className,
}: NavItemProps) {
  const classes = clsx(
    "d2e-nav-item",
    selected && "d2e-nav-item--selected",
    disabled && "d2e-nav-item--disabled",
    className,
  );
  const ariaCurrent = selected ? "page" : undefined;

  // Reserve the selected (bold) width via a hidden heavier copy, so toggling
  // selected changes the weight without reflowing the row (same as Tab).
  const label =
    typeof children === "string" ? (
      <span className="d2e-nav-item__label" data-text={children}>
        {children}
      </span>
    ) : (
      children
    );

  if (href != null && !disabled) {
    return (
      <a className={classes} href={href} aria-current={ariaCurrent} onClick={onClick}>
        {label}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled}
      aria-current={ariaCurrent}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default Navbar;
