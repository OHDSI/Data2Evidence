import Tooltip, { type TooltipProps } from "@mui/material/Tooltip";
import clsx from "clsx";
import "./D2eTooltip.scss";

export type D2eTooltipProps = TooltipProps;

export function D2eTooltip({
  arrow = true,
  placement = "top",
  classes,
  children,
  ...rest
}: D2eTooltipProps) {
  return (
    <Tooltip
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
    </Tooltip>
  );
}

export default D2eTooltip;
