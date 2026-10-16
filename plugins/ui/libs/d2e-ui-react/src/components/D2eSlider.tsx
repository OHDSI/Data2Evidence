import Slider, { type SliderProps } from "@mui/material/Slider";
import clsx from "clsx";
import "./D2eSlider.scss";

export type D2eSliderSize = "sm" | "md";

export interface D2eSliderProps extends Omit<SliderProps, "size" | "color"> {
  size?: D2eSliderSize;
}

export function D2eSlider({ size = "md", className, ...rest }: D2eSliderProps) {
  return (
    <Slider
      className={clsx("d2e-slider", `d2e-slider--${size}`, className)}
      color="primary"
      size={size === "sm" ? "small" : "medium"}
      {...rest}
    />
  );
}

export default D2eSlider;
