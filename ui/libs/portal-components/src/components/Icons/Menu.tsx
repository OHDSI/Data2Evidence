import * as React from "react";
import { SVGProps } from "react";
interface SVGRProps {
  title?: string;
  titleId?: string;
}
const SvgMenu = ({ title, titleId, ...props }: SVGProps<SVGSVGElement> & SVGRProps) => (
  <svg width={24} height={24} xmlns="http://www.w3.org/2000/svg" aria-labelledby={titleId} {...props}>
    {title ? <title id={titleId}>{title}</title> : null}
    <path
      d="M21 17a1 1 0 0 1 0 2H3a1 1 0 0 1 0-2h18zm0-6a1 1 0 0 1 0 2H3a1 1 0 0 1 0-2h18zm0-6a1 1 0 0 1 0 2H3a1 1 0 1 1 0-2h18z"
      fill="navy"
      fillRule="evenodd"
    />
  </svg>
);
export default SvgMenu;
