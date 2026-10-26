import clsx from "clsx";
import "./Spinner.scss";

// Geometry lifted 1:1 from the Figma "Progress/Gradient/Elements/Rings" asset
// (160×160): centreline radius 74.42, stroke 11.163. Kept in viewBox units so
// any `size` scales the stroke proportionally.
const RADIUS = 74.42;
const STROKE = 11.163;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// Navy arc covers ~270° of the ring; the rest is the grey track.
const ARC = CIRCUMFERENCE * 0.75;

export interface SpinnerProps {
  /** Diameter in px. Defaults to the Figma "Page Loading" size (160). */
  size?: number;
  /** Centre the spinner in a full-size flex box (the page-loading pattern). */
  center?: boolean;
  label?: string;
  className?: string;
}

export function Spinner({
  size = 160,
  center = false,
  label = "Loading",
  className,
}: SpinnerProps) {
  const svg = (
    <svg
      className="d2e-spinner"
      width={size}
      height={size}
      viewBox="0 0 160 160"
      role="status"
      aria-label={label}
    >
      <circle
        className="d2e-spinner__track"
        cx="80"
        cy="80"
        r={RADIUS}
        fill="none"
        strokeWidth={STROKE}
      />
      <circle
        className="d2e-spinner__arc"
        cx="80"
        cy="80"
        r={RADIUS}
        fill="none"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={`${ARC} ${CIRCUMFERENCE}`}
      />
    </svg>
  );

  if (center) {
    return <div className={clsx("d2e-spinner-center", className)}>{svg}</div>;
  }
  return className ? (
    <span className={className} style={{ display: "inline-flex" }}>
      {svg}
    </span>
  ) : (
    svg
  );
}

export default Spinner;
