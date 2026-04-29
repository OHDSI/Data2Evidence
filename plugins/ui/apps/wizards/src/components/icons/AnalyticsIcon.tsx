interface AnalyticsIconProps {
  size?: number;
}

export function AnalyticsIcon({ size = 16 }: AnalyticsIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 45 45"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ verticalAlign: "middle" }}
    >
      <mask
        id="analytics-icon-mask"
        style={{ maskType: "alpha" }}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="45"
        height="45"
      >
        <rect width="44.353" height="44.3539" fill="currentColor" />
      </mask>
      <g mask="url(#analytics-icon-mask)">
        <path
          d="M13.4228 31.8293H16.503V22.4351H13.4228V31.8293ZM28.4663 31.8293H31.5465V12.7327H28.4663V31.8293ZM20.9411 31.8293H24.0209V26.3465H20.9411V31.8293ZM20.9411 22.4351H24.0209V19.3548H20.9411V22.4351ZM9.03925 39.4388C8.08443 39.4388 7.26236 39.0941 6.57304 38.4048C5.88372 37.7155 5.53906 36.8934 5.53906 35.9385V9.05453C5.53906 8.09784 5.88372 7.27406 6.57304 6.58319C7.26236 5.89231 8.08443 5.54688 9.03925 5.54688H35.9227C36.8794 5.54688 37.7031 5.89231 38.394 6.58319C39.0849 7.27406 39.4303 8.09784 39.4303 9.05453V35.9385C39.4303 36.8934 39.0849 37.7155 38.394 38.4048C37.7031 39.0941 36.8794 39.4388 35.9227 39.4388H9.03925ZM9.03925 35.9385H35.9227V9.05453H9.03925V35.9385Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}
