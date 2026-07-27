import React, { FC } from "react";
import classNames from "classnames";
import ReactMarkdown from "react-markdown";
import { ToolCallRow } from "./ToolCallRow";
import { ChatMessage, MessageOption } from "./types";

interface MessageBubbleProps {
  message: ChatMessage;
  onSelectOption?: (option: MessageOption) => void;
}

const OptionCard: FC<{ option: MessageOption; onSelect?: (option: MessageOption) => void }> = ({
  option,
  onSelect,
}) => (
  <button
    type="button"
    className={classNames("ai-assistant__option", { "ai-assistant__option--selected": option.selected })}
    onClick={() => onSelect?.(option)}
    aria-pressed={option.selected}
  >
    <span className="ai-assistant__option-title">
      {option.index != null && <span className="ai-assistant__option-index">{option.index}.</span>}
      {option.title}
    </span>
    {option.subtitle && <span className="ai-assistant__option-subtitle">{option.subtitle}</span>}
  </button>
);

// A single chat bubble. User messages are plain text; assistant messages support
// rich structured content (Figma node 1475:130902).
export const MessageBubble: FC<MessageBubbleProps> = ({ message, onSelectOption }) => {
  const isUser = message.role === "user";
  const tools = message.tools ?? [];
  // A turn that is still calling tools has no prose yet, and an empty bubble is just
  // a stray rounded box under the tool rows.
  const hasBubble = Boolean(message.text || message.rich);

  return (
    <div
      className={classNames("ai-assistant__message", {
        "ai-assistant__message--user": isUser,
        "ai-assistant__message--assistant": !isUser,
      })}
    >
      {tools.length > 0 && (
        <div className="ai-assistant__tools">
          {tools.map((tool) => (
            <ToolCallRow key={tool.id} tool={tool} />
          ))}
        </div>
      )}

      {hasBubble && (
        <div className="ai-assistant__bubble">
          {message.text &&
            (isUser ? (
              // What the user typed, verbatim — markdown syntax in a prompt is not formatting
              // the user asked for.
              message.text.split("\n").map((line, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <p key={index} className="ai-assistant__bubble-text">
                  {line}
                </p>
              ))
            ) : (
              // The model answers in markdown (headings, bold, lists, code), so render it as
              // such. Untrusted content: react-markdown escapes raw HTML by default and no
              // rehype-raw is added here.
              <div className="ai-assistant__markdown">
                <ReactMarkdown>{message.text}</ReactMarkdown>
              </div>
            ))}

          {message.rich && (
            <div className="ai-assistant__rich">
              {message.rich.intro && <p className="ai-assistant__bubble-text">{message.rich.intro}</p>}

              {message.rich.filterLabel && (
                <>
                  <p className="ai-assistant__bubble-text ai-assistant__bubble-text--strong">
                    {message.rich.filterLabel}
                  </p>
                  {message.rich.filterItems && (
                    <ul className="ai-assistant__filter-list">
                      {message.rich.filterItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              {message.rich.question && <p className="ai-assistant__bubble-text">{message.rich.question}</p>}

              {message.rich.options && (
                <div className="ai-assistant__options">
                  {message.rich.options.map((option) => (
                    <OptionCard key={option.id} option={option} onSelect={onSelectOption} />
                  ))}
                </div>
              )}

              {message.rich.footer && <p className="ai-assistant__bubble-text">{message.rich.footer}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
