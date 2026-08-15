import React, { FC } from "react";
import Button from "@mui/material/Button";
import { useTranslation } from "../../contexts";
import "./AiAssistantButton.scss";

export const AiAssistantButton: FC = () => {
  const { getText, i18nKeys } = useTranslation();

  return (
    <Button variant="contained" className="ai-assistant-fab">
      {getText(i18nKeys.FEATURE__AI_ASSISTANT)}
    </Button>
  );
};
