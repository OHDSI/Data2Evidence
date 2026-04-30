import React, { HTMLAttributes, ReactNode } from "react";
import classNames from "classnames";
import { Card, Tooltip } from "@portal/components";

import "./ChartContainer.scss";

const TITLE_MAX_LENGTH = 80;

interface ChartContainerProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  children: ReactNode;
}

function ChartContainer({ title, children, className, ...props }: ChartContainerProps) {
  const classes = classNames("chart__container", className);

  const isTruncated = title.length > TITLE_MAX_LENGTH;
  const displayTitle = isTruncated ? `${title.substring(0, TITLE_MAX_LENGTH)}...` : title;

  const titleElement = isTruncated ? (
    <Tooltip title={title}>
      <span aria-label={title} tabIndex={0}>
        {displayTitle}
      </span>
    </Tooltip>
  ) : (
    displayTitle
  );

  return (
    <div className={classes} {...props}>
      <Card title={titleElement} className="chart__card" borderRadius={7}>
        {children}
      </Card>
    </div>
  );
}

export default ChartContainer;
