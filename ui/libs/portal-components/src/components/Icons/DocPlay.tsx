import * as React from "react";
import { SVGProps } from "react";
interface SVGRProps {
  title?: string;
  titleId?: string;
}
const SvgDocPlay = ({ title, titleId, ...props }: SVGProps<SVGSVGElement> & SVGRProps) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <g fill="navy" fillRule="evenodd">
      <path d="M14 1a1.01 1.01 0 0 1 .25.031l.03.009c.03.009.061.02.091.031l.027.012a.914.914 0 0 1 .195.112c.04.03.078.062.114.098l-.093-.082.011.009.082.073 6 6a1.006 1.006 0 0 1 .21.309l.012.027c.012.03.022.06.031.091l.008.03A.921.921 0 0 1 21 8l-.008-.126L21 8v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V4a3 3 0 0 1 3-3h8zm-1 2H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9h-5a1 1 0 0 1-.993-.883L13 8V3zm4.585 4L15 4.415V7h2.585z" />
      <path d="m9 16.54 5.75-3.27L9 10z" />
    </g>
  </svg>
);
export default SvgDocPlay;
