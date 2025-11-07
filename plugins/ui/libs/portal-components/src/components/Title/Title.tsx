import React, { FC, HTMLAttributes } from "react";
import classNames from "classnames";
import "./Title.scss";

export interface TitleProps extends HTMLAttributes<HTMLDivElement> {
  type?: "default" | "subtitle";
}

export const Title: FC<TitleProps> = ({ type = "default", className, ...props }) => {
  const classes = classNames(
    "alp-title",
    { [`alp-title--${type}`]: type !== "default" },
    { [`${className}`]: !!className }
  );
  return <div className={classes} data-testid="title" {...props} />;
};

export interface SubTitleProps extends HTMLAttributes<HTMLDivElement> {}
export const SubTitle: FC<SubTitleProps> = (props) => <Title type="subtitle" {...props} />;
