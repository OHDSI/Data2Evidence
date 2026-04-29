import * as React from "react";
import { SVGProps } from "react";
interface SVGRProps {
  title?: string;
  titleId?: string;
}
const SvgTActive = ({ title, titleId, ...props }: SVGProps<SVGSVGElement> & SVGRProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    viewBox="0 0 24 24"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <g fill="none" fillRule="evenodd" transform="translate(2 2)">
      <circle cx={10} cy={10} r={10} fill="#000080" />
      <text fill="#FFF" fontFamily="ArialMT, Arial" fontSize={12}>
        <tspan x={6.3} y={14.4}>
          {"T"}
        </tspan>
      </text>
    </g>
  </svg>
);
export default SvgTActive;
