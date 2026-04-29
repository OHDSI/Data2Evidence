import React, { forwardRef } from "react";
import { default as MuiSlider, SliderProps as MuiSliderProps } from "@mui/material/Slider";

export type SliderProps = MuiSliderProps;

const SliderInternal = (props: SliderProps, ref: React.Ref<any>) => <MuiSlider {...props} ref={ref} />;

export const Slider = forwardRef(SliderInternal);
