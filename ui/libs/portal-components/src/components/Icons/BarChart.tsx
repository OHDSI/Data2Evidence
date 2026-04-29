import * as React from "react";
import { SVGProps } from "react";
interface SVGRProps {
  title?: string;
  titleId?: string;
}
const SvgBarChart = ({ title, titleId, ...props }: SVGProps<SVGSVGElement> & SVGRProps) => (
  <svg width={24} height={24} xmlns="http://www.w3.org/2000/svg" aria-labelledby={titleId} {...props}>
    {title ? <title id={titleId}>{title}</title> : null}
    <g fill="none" fillRule="evenodd">
      <path d="M0 0h24v24H0z" />
      <path
        d="M18.281 21V10.375M11.906 21V4M5.531 21v-6.375"
        stroke="navy"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.7}
      />
    </g>
  </svg>
);
export default SvgBarChart;
