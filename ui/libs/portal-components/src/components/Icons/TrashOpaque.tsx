import * as React from "react";
import { SVGProps } from "react";
interface SVGRProps {
  title?: string;
  titleId?: string;
}
const SvgTrashOpaque = ({ title, titleId, ...props }: SVGProps<SVGSVGElement> & SVGRProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={25}
    height={25}
    viewBox="0 0 25 25"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <g fill="none" fillRule="evenodd">
      <g>
        <g>
          <g>
            <g>
              <path
                d="M0 0L24 0 24 24 0 24z"
                transform="translate(-934 -350) translate(445 176) translate(24 157) translate(465.85 17.09)"
              />
              <path
                fill="navy"
                d="M7 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H7v10zM18 5h-3l-1-1h-4L9 5H6v2h12V5z"
                transform="translate(-934 -350) translate(445 176) translate(24 157) translate(465.85 17.09)"
              />
            </g>
          </g>
        </g>
      </g>
    </g>
  </svg>
);
export default SvgTrashOpaque;
