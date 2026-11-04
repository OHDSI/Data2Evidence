import type { MouseEvent, ReactNode } from "react";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import clsx from "clsx";
import { Logo } from "./Logo";
import "./Navbar.scss";

/**
 * "next" is the Aug-2026 redesign (navy links, coral underline when selected) —
 * the default and the permanent target. "classic" is the current portal navbar
 * (grey links, thick navy bar when active); kept until the migration lands.
 */
export type NavbarVariant = "classic" | "next";

export interface NavbarProps {
  variant?: NavbarVariant;
  /** Left slot — the product logo. Defaults to the D2E <Logo/>; pass null to omit. */
  logo?: ReactNode;
  /** Right slot — e.g. a dataset selector, icons, or the account menu. */
  end?: ReactNode;
  /** The nav links — typically <NavItem>s. */
  children?: ReactNode;
  className?: string;
}

export function Navbar({ variant = "next", logo, end, children, className }: NavbarProps) {
  const resolvedLogo = logo === undefined ? <Logo /> : logo;
  return (
    <nav className={clsx("d2e-navbar", `d2e-navbar--${variant}`, className)}>
      {resolvedLogo != null && <div className="d2e-navbar__logo">{resolvedLogo}</div>}
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

export interface NavUserProps {
  /** The signed-in user's display name. */
  name: ReactNode;
  /** Avatar node; defaults to a filled user-circle icon. */
  avatar?: ReactNode;
  /** Controls the chevron direction (▾ closed / ▴ open). */
  open?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

// The navbar's right-side profile control (Figma "Right menu"): avatar + name +
// chevron. Use it in the Navbar's `end` slot; wire onClick to open an account Menu.
export function NavUser({ name, avatar, open = false, onClick, className }: NavUserProps) {
  return (
    <button
      type="button"
      className={clsx("d2e-nav-user", className)}
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={onClick}
    >
      <span className="d2e-nav-user__avatar">
        {avatar ?? <AccountCircleIcon />}
      </span>
      <span className="d2e-nav-user__name">{name}</span>
      <KeyboardArrowDownIcon
        className={clsx("d2e-nav-user__chevron", open && "d2e-nav-user__chevron--open")}
      />
    </button>
  );
}

export default Navbar;
