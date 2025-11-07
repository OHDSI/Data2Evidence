import React, { FC } from "react";
import classNames from "classnames";
import "./Card.scss";

type CardProps = Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & {
  title?: React.ReactNode;
  icon?: React.ComponentClass | React.FunctionComponent;
  borderRadius?: number;
};

export const Card: FC<CardProps> = ({ title, icon: Icon, borderRadius = 16, className, children, ...props }) => {
  const classes = classNames("alp-card", { [`${className}`]: !!className });

  return (
    <div className={classes} style={{ borderRadius }} data-testid="card" {...props}>
      {title != null && (
        <div
          className="alp-card__header"
          style={{ borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius }}
        >
          <div className="alp-card__header-title">
            {typeof title === "string" ? (
              <>
                {Icon && <Icon data-testid="card-icon" />}
                <div className="alp-card__header-title-text" data-testid="card-title">
                  {title}
                </div>
              </>
            ) : (
              <>{title}</>
            )}
          </div>
        </div>
      )}
      <div className="alp-card__content" data-testid="card-content">
        {children}
      </div>
    </div>
  );
};
