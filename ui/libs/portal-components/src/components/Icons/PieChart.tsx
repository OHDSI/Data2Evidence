import * as React from "react";
import { SVGProps } from "react";
interface SVGRProps {
  title?: string;
  titleId?: string;
}
const SvgPieChart = ({ title, titleId, ...props }: SVGProps<SVGSVGElement> & SVGRProps) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <g fill="none" fillRule="evenodd">
      <path d="M0 0h24v24H0z" />
      <g stroke="navy" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
        <path d="M20.293 15.504A9.002 9.002 0 1 1 8.402 3.747" />
        <path d="M21.005 12.002A9.002 9.002 0 0 0 12.003 3v9.002h9.002z" />
      </g>
    </g>
  </svg>
);
export default SvgPieChart;
