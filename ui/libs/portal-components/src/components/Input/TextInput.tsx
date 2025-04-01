import React, { AllHTMLAttributes, ChangeEvent, forwardRef } from "react";
import classNames from "classnames";
import webComponentWrapper from "../../webcomponents/webComponentWrapper";
import "./TextInput.scss";

type Ref = HTMLInputElement;

export type TextInputProps = Omit<AllHTMLAttributes<HTMLInputElement>, "onChange"> & {
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

export const TextInput = forwardRef<Ref, TextInputProps>(({ className, onChange: handleInput, ...props }, ref) => {
  const classes = classNames(
    "alp-text-input",
    { [`${className}`]: !!className },
    { "alp-text-input--no-label": !props.label }
  );

  return (
    <d4l-input
      // @ts-ignore
      ref={webComponentWrapper({ handleInput })}
      classes={classes}
      {...props}
    />
  );
});
