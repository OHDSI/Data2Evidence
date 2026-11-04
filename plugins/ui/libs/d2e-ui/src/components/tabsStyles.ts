// Figma 1801:210538 (D2E WebApp, Data quality modal) — an instance of the Tab set
// 2014:2267 in the design-system file lpbqxd8B0OkRKH9kJoCCEa. Tabs share the row
// width equally; the active one carries a 3px primary rule, the row a 1px one.
export const TABS_STYLE_MAP = {
  height: 40,
  paddingX: 24,
  paddingY: 10,
  gap: 10,
  iconSize: 16,
  activeBorderWidth: 3,
  rowBorderWidth: 1,
} as const;

export interface D2eTabItem {
  value: string;
  label: string;
  /** An MDI glyph name, e.g. `mdi-license`. */
  icon?: string;
  disabled?: boolean;
}
