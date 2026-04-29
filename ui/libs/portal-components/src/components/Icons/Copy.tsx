import * as React from "react";
import { SVGProps } from "react";
interface SVGRProps {
  title?: string;
  titleId?: string;
}
const SvgCopy = ({ title, titleId, ...props }: SVGProps<SVGSVGElement> & SVGRProps) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path
      d="M20 8a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3zm0 2h-9a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1zm-7-9a3 3 0 0 1 2.995 2.824L16 4v1a1 1 0 0 1-1.993.117L14 5V4a1 1 0 0 0-.883-.993L13 3H4a1 1 0 0 0-.993.883L3 4v9a1 1 0 0 0 .883.993L4 14h1a1 1 0 0 1 .117 1.993L5 16H4a3 3 0 0 1-2.995-2.824L1 13V4a3 3 0 0 1 2.824-2.995L4 1h9z"
      fill="navy"
      fillRule="nonzero"
    />
  </svg>
);
export default SvgCopy;
