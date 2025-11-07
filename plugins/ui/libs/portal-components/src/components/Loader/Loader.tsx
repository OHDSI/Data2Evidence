import React, { FC } from "react";
import classNames from "classnames";
import "./Loader.scss";

export interface LoaderProps {
  type?: "vertical" | "horizontal";
  text?: string;
}

export const Loader: FC<LoaderProps> = ({ text, type = "vertical" }) => {
  const classes = classNames("alp-loader", { [`alp-loader--${type}`]: !!type });

  return (
    <div className={classes} data-testid="loader">
      <d4l-spinner />
      {text && <div className="alp-loader__text">{text}</div>}
    </div>
  );
};
