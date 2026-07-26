import React, { FC, KeyboardEvent, useState } from "react";
import classNames from "classnames";
import { IconButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "../../contexts";
import { QuickReply } from "./types";

interface ChatComposerProps {
  quickReplies?: QuickReply[];
  onSend: (text: string) => void;
  onQuickReply?: (reply: QuickReply) => void;
}

// Bottom composer: optional quick-reply chips above a text input with add + send controls
// (Figma nodes 1475:129006 / 1475:130926).
export const ChatComposer: FC<ChatComposerProps> = ({ quickReplies, onSend, onQuickReply }) => {
  const { getText, i18nKeys } = useTranslation();
  const [value, setValue] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="ai-assistant__composer">
      {quickReplies && quickReplies.length > 0 && (
        <div className="ai-assistant__quick-replies">
          {quickReplies.map((reply) => (
            <button
              key={reply.id}
              type="button"
              className={classNames("ai-assistant__chip", {
                "ai-assistant__chip--selected": reply.selected,
              })}
              onClick={() => onQuickReply?.(reply)}
            >
              {reply.dismiss && <CloseIcon className="ai-assistant__chip-icon" sx={{ fontSize: 12 }} />}
              {reply.label}
            </button>
          ))}
        </div>
      )}

      <div className="ai-assistant__input">
        <IconButton
          className="ai-assistant__input-add"
          size="small"
          aria-label={getText(i18nKeys.AI_ASSISTANT__ADD_ATTACHMENT)}
          title={getText(i18nKeys.AI_ASSISTANT__ADD_ATTACHMENT)}
        >
          <AddIcon fontSize="small" />
        </IconButton>

        <textarea
          className="ai-assistant__input-field"
          rows={1}
          value={value}
          placeholder={getText(i18nKeys.AI_ASSISTANT__INPUT_PLACEHOLDER)}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          data-testid="ai-assistant-input"
        />

        <IconButton
          className="ai-assistant__input-send"
          size="small"
          onClick={submit}
          disabled={!value.trim()}
          aria-label={getText(i18nKeys.AI_ASSISTANT__SEND)}
          title={getText(i18nKeys.AI_ASSISTANT__SEND)}
          data-testid="ai-assistant-send"
        >
          <ArrowUpwardIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </div>
    </div>
  );
};
