import * as React from "react";
import { SVGProps } from "react";
interface SVGRProps {
  title?: string;
  titleId?: string;
}
const SvgEllipsisVertical = ({ title, titleId, ...props }: SVGProps<SVGSVGElement> & SVGRProps) => (
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
      d="M12 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0-7a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0-7a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"
      fill="navy"
      fillRule="nonzero"
    />
  </svg>
);
export default SvgEllipsisVertical;
