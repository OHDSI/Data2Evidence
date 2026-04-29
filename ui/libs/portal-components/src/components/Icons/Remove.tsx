import * as React from "react";
import { SVGProps } from "react";
interface SVGRProps {
  title?: string;
  titleId?: string;
}
const SvgRemove = ({ title, titleId, ...props }: SVGProps<SVGSVGElement> & SVGRProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    viewBox="0 0 24 24"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <g fill="none" fillRule="evenodd">
      <circle cx={12} cy={12} r={12} fill="navy" />
      <path
        fill="#FFF"
        d="M17.835625,11.1 C18.2970344,11.1 18.67,11.5032 18.67,12 C18.67,12.4968 18.2970344,12.9 17.835625,12.9 L6.154375,12.9 C5.69296563,12.9 5.32,12.4968 5.32,12 C5.32,11.5032 5.69296563,11.1 6.154375,11.1 L17.835625,11.1 Z"
      />
    </g>
  </svg>
);
export default SvgRemove;
