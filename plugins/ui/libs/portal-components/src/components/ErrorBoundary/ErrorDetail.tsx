import React, { FC } from "react";
import "./ErrorDetail.scss";

interface ErrorDetailProps {
  title: string;
  subtitle?: string;
}

export const ErrorDetail: FC<ErrorDetailProps> = ({ title, subtitle }) => {
  return (
    <div className="error-detail">
      <h2>{title}</h2>
      {subtitle && <div>{subtitle}</div>}
    </div>
  );
};
