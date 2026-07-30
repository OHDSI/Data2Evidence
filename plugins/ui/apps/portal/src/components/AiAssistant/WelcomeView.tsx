import React, { FC } from "react";
import { useTranslation } from "../../contexts";
import { AskAiIcon } from "../Header/AskAiButton/AskAiIcon";
import { SUGGESTIONS } from "./suggestions";

interface WelcomeViewProps {
  onSelectSuggestion: (prompt: string) => void;
}

// Empty / welcome state: centered sparkle + greeting and the suggestion pills
// (Figma node 1475:128986).
export const WelcomeView: FC<WelcomeViewProps> = ({ onSelectSuggestion }) => {
  const { getText, i18nKeys } = useTranslation();

  return (
    <div className="ai-assistant__welcome">
      <div className="ai-assistant__welcome-intro">
        <AskAiIcon width={48} height={48} />
        <p className="ai-assistant__greeting">{getText(i18nKeys.AI_ASSISTANT__GREETING)}</p>
      </div>

      <div className="ai-assistant__suggestions">
        {SUGGESTIONS.map((suggestion) => {
          const label = getText(suggestion.labelKey);
          return (
            <button
              key={suggestion.id}
              type="button"
              className="ai-assistant__suggestion"
              onClick={() => onSelectSuggestion(label)}
              data-testid={`ai-suggestion-${suggestion.id}`}
            >
              <span className="ai-assistant__suggestion-icon">{suggestion.icon}</span>
              <span className="ai-assistant__suggestion-label">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
