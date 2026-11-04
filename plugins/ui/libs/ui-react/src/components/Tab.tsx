import { forwardRef } from "react";
import type { ReactElement, ReactNode } from "react";
import MuiTabs, { type TabsProps as MuiTabsProps } from "@mui/material/Tabs";
import MuiTab, { type TabProps as MuiTabProps } from "@mui/material/Tab";
import clsx from "clsx";
import { resolveIcon, type Icon } from "./internal/icon";
import type { TabSize } from "./tabSizes";
import "./Tab.scss";

export interface TabsProps<Value = number>
  extends Omit<MuiTabsProps, "onChange" | "value"> {
  value?: Value;
  onChange?: (value: Value) => void;
  size?: TabSize;
  children?: ReactNode;
}

export function Tabs<Value = number>({
  value,
  onChange,
  size = "default",
  className,
  children,
  ...rest
}: TabsProps<Value>) {
  return (
    <MuiTabs
      className={clsx("d2e-tabs", `d2e-tabs--${size}`, className)}
      value={value}
      onChange={(_event, next) => onChange?.(next as Value)}
      variant="scrollable"
      scrollButtons={false}
      {...rest}
    >
      {children}
    </MuiTabs>
  );
}

export interface TabProps extends Omit<MuiTabProps, "icon" | "iconPosition"> {
  icon?: Icon;
  iconPosition?: "front" | "back";
}

export const Tab = forwardRef<HTMLDivElement, TabProps>(function Tab(
  { icon, iconPosition = "front", label, className, ...rest },
  ref,
) {
  const placement = icon ? (iconPosition === "back" ? "back" : "front") : "none";
  // Reserve the bold (selected) width so switching weight never reflows the tab.
  const wrappedLabel =
    typeof label === "string" ? (
      <span className="d2e-tab__label" data-text={label}>
        {label}
      </span>
    ) : (
      label
    );
  return (
    <MuiTab
      ref={ref}
      disableRipple={false}
      className={clsx("d2e-tab", `d2e-tab--icon-${placement}`, className)}
      icon={icon ? (resolveIcon(icon, { fontSize: 20 }) as ReactElement) : undefined}
      iconPosition={iconPosition === "back" ? "end" : "start"}
      label={wrappedLabel}
      {...rest}
    />
  );
});

export default Tab;
