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
import { resolveIcon } from "./internal/icon";
import "./D2eMenu.scss";

export interface D2eMenuItem {
  label: string;
  value: string;
  icon?: string;
  selected?: boolean;
  disabled?: boolean;
  /** Destructive action: the label and icon paint in the alarm colour. */
  danger?: boolean;
}

export interface D2eMenuProps {
  items: D2eMenuItem[];
  width?: number | string;
  onSelect?: (value: string) => void;
  closeOnSelect?: boolean;
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
  items: D2eMenuItem[];
  width?: number | string;
  onSelect?: (value: string) => void;
  autoFocusFirst?: boolean;
  children?: ReactNode;
}) {
  const itemEls = useRef<(HTMLButtonElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const tabbableIndex = useMemo(() => {
    if (
      activeIndex >= 0 &&
      activeIndex < items.length &&
      !items[activeIndex]?.disabled
    )
      return activeIndex;
    const selected = items.findIndex((item) => item.selected && !item.disabled);
    return selected >= 0 ? selected : firstEnabledIndex(items);
  }, [activeIndex, items]);

  const focusIndex = useCallback((index: number) => {
    if (index < 0) return;
    setActiveIndex(index);
    itemEls.current[index]?.focus();
  }, []);

  useEffect(() => {
    if (autoFocusFirst) focusIndex(firstEnabledIndex(items));
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
      focusIndex(nextEnabledIndex(items, from, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusIndex(nextEnabledIndex(items, from < 0 ? items.length : from, -1));
    } else if (event.key === "Home") {
      event.preventDefault();
      focusIndex(firstEnabledIndex(items));
    } else if (event.key === "End") {
      event.preventDefault();
      focusIndex(lastEnabledIndex(items));
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
      {items.map((item, index) => (
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
      ))}
    </div>
  );
}

export function D2eMenu({
  items,
  width = 330,
  onSelect,
  closeOnSelect = true,
  activator,
  children,
}: D2eMenuProps) {
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
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
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

export default D2eMenu;
