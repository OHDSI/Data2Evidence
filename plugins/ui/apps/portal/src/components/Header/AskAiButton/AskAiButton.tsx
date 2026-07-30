import React, { FC } from "react";
import Button from "@mui/material/Button";
import { useTranslation } from "../../../contexts";
import { AskAiIcon } from "./AskAiIcon";
import "./AskAiButton.scss";

interface AskAiButtonProps {
  onClick?: (event?: React.MouseEvent<HTMLButtonElement>) => void;
}

export const AskAiButton: FC<AskAiButtonProps> = ({ onClick }) => {
  const { getText, i18nKeys } = useTranslation();

  return (
    <Button
      variant="outlined"
      className="ask-ai-button"
      startIcon={<AskAiIcon />}
      onClick={onClick}
      data-testid="ask-ai-button"
    >
      {getText(i18nKeys.ASK_AI_BUTTON__LABEL)}
    </Button>
  );
};
