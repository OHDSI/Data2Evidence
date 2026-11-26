import React, { FC, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@portal/components";
import { config } from "../../../../../config";
import { useTranslation } from "../../../../../contexts";
import "./AccountButton.scss";

// Shown on public pages only, so the user is never signed in here.
export const AccountButton: FC = () => {
  const navigate = useNavigate();
  const { getText, i18nKeys } = useTranslation();

  const handleAccountClick = useCallback(() => {
    navigate(config.ROUTES.login);
  }, [navigate]);

  return (
    <Button
      containerClassName="account-button"
      variant="outlined"
      text={getText(i18nKeys.ACCOUNT_BUTTON__LOGIN)}
      onClick={handleAccountClick}
    />
  );
};
