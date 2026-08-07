import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { IconButton } from "../Button/IconButton";
import { Tooltip } from "../Tooltip/Tooltip";
import { CopyIcon, CheckIcon } from "../Icons";
import "./Text.scss";

const COPY_FEEDBACK_DURATION_MS = 3000;

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
  const [copied, setCopied] = useState(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  const handleCopyString = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    resetTimeoutRef.current = setTimeout(() => {
      setCopied(false);
      resetTimeoutRef.current = null;
    }, COPY_FEEDBACK_DURATION_MS);
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
          <Tooltip title="Copy" placement="top">
            <span>
              <IconButton
                startIcon={copied ? <CheckIcon width={24} height={24} /> : <CopyIcon width={24} height={24} />}
                onClick={() => handleCopyString(props.children)}
              />
            </span>
          </Tooltip>
        </div>
      )}
    </div>
  );
};
