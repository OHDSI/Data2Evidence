import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Popover from "@mui/material/Popover";
import CheckIcon from "@mui/icons-material/Check";
import clsx from "clsx";
import {
  firstEnabledIndex,
  lastEnabledIndex,
  nextEnabledIndex,
} from "./menuNavigation";
import { resolveIcon, type Icon } from "./internal/icon";
import "./Menu.scss";

export interface MenuItem {
  label: string;
  value: string;
  icon?: Icon;
  selected?: boolean;
  disabled?: boolean;
  /** Destructive action: the label and icon paint in the alarm colour. */
  danger?: boolean;
  /** Render a horizontal divider between groups instead of an action row. */
  divider?: boolean;
}

/** Which corner of the trigger the popover grows from. */
export type MenuPlacement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

const PLACEMENT_ORIGINS: Record<
  MenuPlacement,
  {
    anchorOrigin: { vertical: "top" | "bottom"; horizontal: "left" | "right" };
    transformOrigin: { vertical: "top" | "bottom"; horizontal: "left" | "right" };
  }
> = {
  "bottom-start": {
    anchorOrigin: { vertical: "bottom", horizontal: "left" },
    transformOrigin: { vertical: "top", horizontal: "left" },
  },
  "bottom-end": {
    anchorOrigin: { vertical: "bottom", horizontal: "right" },
    transformOrigin: { vertical: "top", horizontal: "right" },
  },
  "top-start": {
    anchorOrigin: { vertical: "top", horizontal: "left" },
    transformOrigin: { vertical: "bottom", horizontal: "left" },
  },
  "top-end": {
    anchorOrigin: { vertical: "top", horizontal: "right" },
    transformOrigin: { vertical: "bottom", horizontal: "right" },
  },
};

export interface MenuProps {
  items: MenuItem[];
  width?: number | string;
  onSelect?: (value: string) => void;
  closeOnSelect?: boolean;
  /**
   * Preferred corner the popover opens from (default "bottom-end"). The popover
   * still shifts to stay within the viewport (MUI keeps a 16px margin and caps
   * height with internal scroll); it does not flip to the opposite side.
   */
  placement?: MenuPlacement;
  /** Render the trigger to anchor a popover. With none, the list is inline. */
  activator?: (args: {
    open: (event: React.MouseEvent<HTMLElement>) => void;
    isOpen: boolean;
  }) => ReactNode;
  children?: ReactNode;
}

function MenuList({
  items,
  width,
  onSelect,
  autoFocusFirst,
  children,
}: {
  items: MenuItem[];
  width?: number | string;
  onSelect?: (value: string) => void;
  autoFocusFirst?: boolean;
  children?: ReactNode;
}) {
  const itemEls = useRef<(HTMLButtonElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Dividers are non-interactive: mark them disabled so roving-tabindex nav skips
  // them (indices stay aligned with the rendered list).
  const navItems = useMemo(
    () => items.map((item) => (item.divider ? { ...item, disabled: true } : item)),
    [items],
  );

  const tabbableIndex = useMemo(() => {
    if (
      activeIndex >= 0 &&
      activeIndex < navItems.length &&
      !navItems[activeIndex]?.disabled
    )
      return activeIndex;
    const selected = navItems.findIndex(
      (item) => item.selected && !item.disabled,
    );
    return selected >= 0 ? selected : firstEnabledIndex(navItems);
  }, [activeIndex, navItems]);

  const focusIndex = useCallback((index: number) => {
    if (index < 0) return;
    setActiveIndex(index);
    itemEls.current[index]?.focus();
  }, []);

  useEffect(() => {
    if (autoFocusFirst) focusIndex(firstEnabledIndex(navItems));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocusFirst]);

  const focusedIndex = () => {
    const active = typeof document === "undefined" ? null : document.activeElement;
    if (!active) return -1;
    return itemEls.current.findIndex((el) => el !== null && el === active);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const from = focusedIndex();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusIndex(nextEnabledIndex(navItems, from, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusIndex(nextEnabledIndex(navItems, from < 0 ? navItems.length : from, -1));
    } else if (event.key === "Home") {
      event.preventDefault();
      focusIndex(firstEnabledIndex(navItems));
    } else if (event.key === "End") {
      event.preventDefault();
      focusIndex(lastEnabledIndex(navItems));
    }
  };

  if (children) return <>{children}</>;

  const resolvedWidth = typeof width === "number" ? `${width}px` : width;

  return (
    <div
      className="d2e-menu"
      role="menu"
      style={{ width: resolvedWidth }}
      onKeyDown={onKeyDown}
    >
      {items.map((item, index) =>
        item.divider ? (
          <div key={item.value} className="d2e-menu__divider" role="separator" />
        ) : (
        <button
          key={item.value}
          ref={(el) => {
            itemEls.current[index] = el;
          }}
          type="button"
          className={clsx("d2e-menu__item", {
            "d2e-menu__item--selected": item.selected,
            "d2e-menu__item--disabled": item.disabled,
            "d2e-menu__item--danger": item.danger,
          })}
          role="menuitem"
          tabIndex={index === tabbableIndex ? 0 : -1}
          disabled={item.disabled}
          onClick={() => onSelect?.(item.value)}
          onFocus={() => setActiveIndex(index)}
        >
          {item.icon ? (
            <span className="d2e-menu__item-icon">
              {resolveIcon(item.icon, { fontSize: 20 })}
            </span>
          ) : null}
          <span className="d2e-menu__item-label">{item.label}</span>
          {item.selected ? (
            <CheckIcon className="d2e-menu__item-check" sx={{ fontSize: "20px" }} />
          ) : null}
        </button>
        ),
      )}
    </div>
  );
}

export function Menu({
  items,
  width = 330,
  onSelect,
  closeOnSelect = true,
  placement = "bottom-end",
  activator,
  children,
}: MenuProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const isOpen = Boolean(anchorEl);

  const handleSelect = (value: string) => {
    onSelect?.(value);
    if (closeOnSelect) setAnchorEl(null);
  };

  if (!activator) {
    return (
      <MenuList items={items} width={width} onSelect={onSelect}>
        {children}
      </MenuList>
    );
  }

  return (
    <>
      {activator({
        open: (event) => setAnchorEl(event.currentTarget),
        isOpen,
      })}
      <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={PLACEMENT_ORIGINS[placement].anchorOrigin}
        transformOrigin={PLACEMENT_ORIGINS[placement].transformOrigin}
      >
        <MenuList
          items={items}
          width={width}
          onSelect={handleSelect}
          autoFocusFirst
        >
          {children}
        </MenuList>
      </Popover>
    </>
  );
}

export default Menu;
