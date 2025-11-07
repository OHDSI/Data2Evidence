import React, { HTMLAttributes, ReactNode } from "react";
import classNames from "classnames";
import { Card } from "@portal/components";

import "./ChartContainer.scss";

interface ChartContainerProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  children: ReactNode;
}

function ChartContainer({ title, children, className, ...props }: ChartContainerProps) {
  const classes = classNames("chart__container", className);

  return (
    <div className={classes} {...props}>
      <Card title={title} className="chart__card" borderRadius={7}>
        {children}
      </Card>
    </div>
  );
}

export default ChartContainer;
