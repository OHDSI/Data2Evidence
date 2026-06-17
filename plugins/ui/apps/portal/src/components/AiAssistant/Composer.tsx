import React, { FC, useState, useRef, KeyboardEvent } from "react";

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const Composer: FC<ComposerProps> = ({
  onSend,
  disabled = false,
  placeholder = "Ask about cohorts…",
}) => {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    // Reset height after clearing
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const canSend = !disabled && value.trim().length > 0;

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "10px 12px",
        borderTop: "1px solid var(--color-ui-light-border, #dddddd)",
        alignItems: "flex-end",
        flexShrink: 0,
        background: "var(--color-ui-lightest-bg, #ffffff)",
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        style={{
          flex: 1,
          resize: "none",
          border: "1px solid var(--color-ui-medium-border, #cccccc)",
          borderRadius: 8,
          padding: "8px 10px",
          fontSize: 13,
          fontFamily: "inherit",
          outline: "none",
          overflowY: "hidden",
          transition: "border-color 0.15s",
          background: disabled ? "var(--color-ui-extra-light-bg, #f9f9f9)" : "var(--color-ui-lightest-bg, #ffffff)",
          color: "var(--color-ui-darkest-text, #000080)",
          lineHeight: 1.4,
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-primary, #000080)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-ui-medium-border, #cccccc)")}
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          border: "none",
          background: canSend ? "var(--color-primary, #000080)" : "var(--color-ui-medium-bg, #dddddd)",
          color: canSend ? "var(--color-ui-lightest-bg, #ffffff)" : "var(--color-mri-disabled-text, #c0c0c0)",
          cursor: canSend ? "pointer" : "not-allowed",
          fontSize: 13,
          fontWeight: 600,
          flexShrink: 0,
          transition: "background 0.15s",
          lineHeight: 1,
          height: 36,
        }}
      >
        Send
      </button>
    </div>
  );
};

export default Composer;
