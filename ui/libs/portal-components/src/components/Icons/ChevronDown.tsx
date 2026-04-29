import * as React from "react";
import { SVGProps } from "react";
interface SVGRProps {
  title?: string;
  titleId?: string;
}
const SvgChevronDown = ({ title, titleId, ...props }: SVGProps<SVGSVGElement> & SVGRProps) => (
  <svg width={24} height={24} xmlns="http://www.w3.org/2000/svg" aria-labelledby={titleId} {...props}>
    {title ? <title id={titleId}>{title}</title> : null}
    <path d="m17.13 8.5 1.37 1.393L12 16.5 5.5 9.893 6.87 8.5 12 13.714z" fill="navy" fillRule="evenodd" />
  </svg>
);
export default SvgChevronDown;
