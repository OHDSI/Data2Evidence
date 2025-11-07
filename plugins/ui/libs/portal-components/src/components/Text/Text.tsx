import React, { FC, useCallback } from "react";
import classNames from "classnames";
import { IconButton } from "../Button/IconButton";
import { CopyIcon } from "../Icons";
import "./Text.scss";

export interface TextProps {
  showCopy?: boolean;
  textWidth?: string;
  textFormat: "wrap" | "double-wrap" | "no-wrap";
  children: string;
  className?: string;
  textStyle?: React.CSSProperties;
  buttonStyle?: React.CSSProperties;
}

export const Text: FC<TextProps> = ({ className, ...props }) => {
  const classes = classNames("alp-text__container", { [`${className}`]: !!className });
  const { showCopy, textWidth, textFormat, textStyle, buttonStyle } = props;

  const handleCopyString = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  return (
    <div className={classes} style={{ flexWrap: "nowrap" }}>
      {showCopy ? (
        <div style={{ overflow: "hidden" }}>
          <div className={`alp-text--${textFormat}`} style={{ ...(textStyle && textStyle) }}>
            {props.children}
          </div>
        </div>
      ) : (
        <div className={`alp-text--${textFormat}`} style={{ width: textWidth, ...(textStyle && textStyle) }}>
          {props.children}
        </div>
      )}

      {showCopy && (
        <div className="alp-text__copy-button-container" style={{ ...(buttonStyle && buttonStyle) }}>
          <IconButton startIcon={<CopyIcon />} onClick={() => handleCopyString(props.children)} />
        </div>
      )}
    </div>
  );
};
