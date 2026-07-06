import React, { FC } from "react";
import Button from "@mui/material/Button";
import { useEnabledFeatures } from "../../hooks";
import { useTranslation } from "../../contexts";
import "./AiAssistantButton.scss";

const AI_ASSISTANT_FEATURE_FLAG = "aiAssistant";

export const AiAssistantButton: FC = () => {
  const [features] = useEnabledFeatures();
  const { getText, i18nKeys } = useTranslation();

  if (!features.includes(AI_ASSISTANT_FEATURE_FLAG)) {
    return null;
  }

  return (
    <Button variant="contained" className="ai-assistant-fab">
      {getText(i18nKeys.FEATURE__AI_ASSISTANT)}
    </Button>
  );
};
