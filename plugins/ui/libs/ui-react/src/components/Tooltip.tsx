import MuiTooltip, { type TooltipProps as MuiTooltipProps } from "@mui/material/Tooltip";
import clsx from "clsx";
import "./Tooltip.scss";

export type TooltipProps = MuiTooltipProps;

export function Tooltip({
  arrow = true,
  placement = "top",
  classes,
  children,
  ...rest
}: TooltipProps) {
  return (
    <MuiTooltip
      arrow={arrow}
      placement={placement}
      classes={{
        ...classes,
        tooltip: clsx("d2e-tooltip", classes?.tooltip),
        arrow: clsx("d2e-tooltip__arrow", classes?.arrow),
      }}
      {...rest}
    >
      {children}
    </MuiTooltip>
  );
}

export default Tooltip;
