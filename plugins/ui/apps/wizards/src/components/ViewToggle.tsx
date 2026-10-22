import styles from "./ViewToggle.module.css";

export const GRID_VIEW_ICON =
  "M3 11H11V3H3M5 5H9V9H5M13 21H21V13H13M15 15H19V19H15M3 21H11V13H3M5 15H9V19H5M13 3V11H21V3M19 9H15V5H19Z";
export const LIST_VIEW_ICON =
  "M3 5V19H20V5H3M7 7V9H5V7H7M5 13V11H7V13H5M5 15H7V17H5V15M18 17H9V15H18V17M18 13H9V11H18V13M18 9H9V7H18V9Z";

export interface ViewToggleOption<T extends string> {
  value: T;
  label: string;
  iconPath: string;
}

interface ViewToggleProps<T extends string> {
  value: T;
  options: readonly ViewToggleOption<T>[];
  ariaLabel: string;
  onChange: (value: T) => void;
}

export function ViewToggle<T extends string>({ value, options, ariaLabel, onChange }: ViewToggleProps<T>) {
  return (
    <div className={styles.toggle} role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={selected ? `${styles.option} ${styles.selected}` : styles.option}
            aria-label={option.label}
            aria-pressed={selected}
            onClick={() => {
              if (!selected) onChange(option.value);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={option.iconPath} />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
