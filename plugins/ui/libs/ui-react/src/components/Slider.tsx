import MuiSlider, { type SliderProps as MuiSliderProps } from "@mui/material/Slider";
import clsx from "clsx";
import "./Slider.scss";

export type SliderSize = "sm" | "md";

export interface SliderProps extends Omit<MuiSliderProps, "size" | "color"> {
  size?: SliderSize;
}

export function Slider({ size = "md", className, ...rest }: SliderProps) {
  return (
    <MuiSlider
      className={clsx("d2e-slider", `d2e-slider--${size}`, className)}
      color="primary"
      size={size === "sm" ? "small" : "medium"}
      {...rest}
    />
  );
}

export default Slider;
