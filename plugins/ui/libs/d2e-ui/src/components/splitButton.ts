// Figma 2855:278235 (the Data quality checks Download button), an instance of
// the Split button set 2059:2025 in the design-system file.
//
// Figma draws the menu (1783:377463) at the button's own 177px, which fits its
// labels in GT America. In IBM Plex Sans "Download as JSON" does not fit and
// truncates, so the menu takes its content's width instead.
export const SPLIT_BUTTON_STYLE_MAP = {
  height: 40,
  radius: 8,
  paddingX: 16,
  iconSize: 22,
  chevronWidth: 40,
  menuWidth: "max-content",
} as const;
