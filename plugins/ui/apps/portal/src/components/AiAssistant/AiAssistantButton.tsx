import React, { FC } from "react";
import Button from "@mui/material/Button";
import { useEnabledFeatures } from "../../hooks";
import "./AiAssistantButton.scss";

const AI_ASSISTANT_FEATURE_FLAG = "aiAssistant";

export const AiAssistantButton: FC = () => {
  const [features] = useEnabledFeatures();

  if (!features.includes(AI_ASSISTANT_FEATURE_FLAG)) {
    return null;
  }

  return (
    <Button variant="contained" className="ai-assistant-fab">
      Placeholder
    </Button>
  );
};
