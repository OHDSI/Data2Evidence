import React, { FC } from "react";
import classNames from "classnames";
import { ChatMessage, MessageOption, ToolActivity } from "./types";

// Tool names are the agent's ids (pa_apply_cohort_patch, search_concepts, …).
// Shown as-is minus the surface prefix: they are the honest record of what the
// assistant actually did, and inventing friendly names for a set that grows on
// both the browser and server side would drift out of date silently.
const ToolBadge: FC<{ tool: ToolActivity }> = ({ tool }) => (
  <span
    className={classNames("ai-assistant__tool", `ai-assistant__tool--${tool.state}`)}
    data-testid={`ai-tool-${tool.name}`}
  >
    {tool.name.replace(/^pa_/, "")}
  </span>
);

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

  return (
    <div
      className={classNames("ai-assistant__message", {
        "ai-assistant__message--user": isUser,
        "ai-assistant__message--assistant": !isUser,
      })}
    >
      <div className="ai-assistant__bubble">
        {message.tools && message.tools.length > 0 && (
          <div className="ai-assistant__tools">
            {message.tools.map((tool) => (
              <ToolBadge key={tool.id} tool={tool} />
            ))}
          </div>
        )}

        {message.text &&
          message.text.split("\n").map((line, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <p key={index} className="ai-assistant__bubble-text">
              {line}
            </p>
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
    </div>
  );
};
