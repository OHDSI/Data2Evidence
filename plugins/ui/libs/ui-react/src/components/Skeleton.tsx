import MuiSkeleton from "@mui/material/Skeleton";
import clsx from "clsx";
import "./Skeleton.scss";

export interface SkeletonProps {
  /** MUI shape. Figma's skeleton bar is a 4px-radius "rounded". */
  variant?: "text" | "rectangular" | "rounded" | "circular";
  width?: number | string;
  height?: number | string;
  animation?: "pulse" | "wave" | false;
  className?: string;
}

// Figma "Skeleton" (node 2108:3012) is documented as MUI Skeleton. The design
// system only restyles it: fill rgba(0,0,0,0.04) (--action/hover) + 4px radius.
export function Skeleton({
  variant = "rounded",
  width,
  height,
  animation = "wave",
  className,
}: SkeletonProps) {
  return (
    <MuiSkeleton
      className={clsx("d2e-skeleton", className)}
      variant={variant}
      width={width}
      height={height}
      animation={animation}
    />
  );
}

export default Skeleton;
