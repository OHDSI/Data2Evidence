import * as React from "react";
import { SVGProps } from "react";
interface SVGRProps {
  title?: string;
  titleId?: string;
}
const SvgCheck = ({ title, titleId, ...props }: SVGProps<SVGSVGElement> & SVGRProps) => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 14 14"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <g fill="none" fillRule="evenodd">
      <path d="M0 0h14v14H0z" />
      <path fill="navy" d="M5.25 9.45 2.8 7l-.817.817 3.267 3.266 7-7-.817-.816z" />
    </g>
  </svg>
);
export default SvgCheck;
