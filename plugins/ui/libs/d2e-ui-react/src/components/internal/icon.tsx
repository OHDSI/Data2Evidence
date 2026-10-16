import type { ComponentType, ReactNode } from "react";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckIcon from "@mui/icons-material/Check";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

// Icon props accept a React node or one of the MDI names the design system
// uses; this registry maps those names to the matching MUI glyph.
const MDI_REGISTRY: Record<string, ComponentType<SvgIconProps>> = {
  "mdi-close": CloseIcon,
  "mdi-check": CheckIcon,
  "mdi-calendar-today": CalendarTodayIcon,
  "mdi-check-circle-outline": CheckCircleOutlineIcon,
  "mdi-alert-outline": WarningAmberIcon,
  "mdi-account": PersonIcon,
};

export type D2eIcon = ReactNode | string;

export function resolveIcon(
  icon: D2eIcon | undefined,
  options: { fontSize?: number; className?: string } = {},
): ReactNode {
  if (icon == null || icon === false) return null;

  if (typeof icon === "string") {
    const Glyph = MDI_REGISTRY[icon];
    if (!Glyph) return null;
    const { fontSize, className } = options;
    return (
      <Glyph
        className={className}
        sx={fontSize ? { fontSize: `${fontSize}px` } : undefined}
      />
    );
  }

  return icon;
}
