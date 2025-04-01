import React, { AllHTMLAttributes, ChangeEvent, forwardRef } from "react";
import classNames from "classnames";
import webComponentWrapper from "../../webcomponents/webComponentWrapper";

type Ref = HTMLInputElement;

export type TextAreaProps = Omit<AllHTMLAttributes<HTMLInputElement>, "onChange"> & {
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

export const TextArea = forwardRef<Ref, TextAreaProps>(({ className, onChange: handleInput, ...props }, ref) => {
  const classes = classNames("alp-text-input", { [`${className}`]: !!className });

  return (
    <d4l-textarea
      // @ts-ignore
      ref={webComponentWrapper({ handleInput })}
      classes={classes}
      {...props}
    />
  );
});
