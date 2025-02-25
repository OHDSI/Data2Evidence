import React, { AllHTMLAttributes, ChangeEvent, FC } from "react";
import webComponentWrapper from "../../webcomponents/webComponentWrapper";
import classNames from "classnames";
import "./Checkbox.scss";

type CheckboxProps = AllHTMLAttributes<HTMLInputElement> & {
  title?: string;
  label?: string;
  className?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  variant?: "primary";
};

export const Checkbox: FC<CheckboxProps> = ({
  checked,
  disabled,
  label,
  className,
  variant = "primary",
  onChange: handleChange,
  ...props
}) => {
  const classes = classNames(
    "alp-checkbox",
    { [`alp-checkbox--${variant}`]: !!variant },
    { [`${className}`]: !!className }
  );

  return (
    <div className="alp-checkbox__container">
      <d4l-checkbox
        // @ts-ignore
        ref={webComponentWrapper({ handleChange })}
        classes={classes}
        checked={checked}
        checkbox-id={label}
        label={label}
        disabled={disabled}
        {...props}
      />
    </div>
  );
};
