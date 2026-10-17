import { forwardRef } from "react";
import type { ReactElement, ReactNode } from "react";
import Tabs, { type TabsProps } from "@mui/material/Tabs";
import Tab, { type TabProps } from "@mui/material/Tab";
import clsx from "clsx";
import { resolveIcon, type D2eIcon } from "./internal/icon";
import type { D2eTabSize } from "./tabSizes";
import "./D2eTab.scss";

export interface D2eTabsProps<Value = number>
  extends Omit<TabsProps, "onChange" | "value"> {
  value?: Value;
  onChange?: (value: Value) => void;
  size?: D2eTabSize;
  children?: ReactNode;
}

export function D2eTabs<Value = number>({
  value,
  onChange,
  size = "default",
  className,
  children,
  ...rest
}: D2eTabsProps<Value>) {
  return (
    <Tabs
      className={clsx("d2e-tabs", `d2e-tabs--${size}`, className)}
      value={value}
      onChange={(_event, next) => onChange?.(next as Value)}
      variant="scrollable"
      scrollButtons={false}
      {...rest}
    >
      {children}
    </Tabs>
  );
}

export interface D2eTabProps extends Omit<TabProps, "icon" | "iconPosition"> {
  icon?: D2eIcon;
  iconPosition?: "front" | "back";
}

export const D2eTab = forwardRef<HTMLDivElement, D2eTabProps>(function D2eTab(
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
    <Tab
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

export default D2eTab;
