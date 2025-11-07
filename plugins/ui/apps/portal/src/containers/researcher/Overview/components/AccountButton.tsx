import React, { FC, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@portal/components";
import { config } from "../../../../config";
import { isAuthenticated } from "../../../auth";
import { useTranslation } from "../../../../contexts";
import "./AccountButton.scss";

export const AccountButton: FC = () => {
  const isAuth = isAuthenticated();
  const navigate = useNavigate();
  const { getText, i18nKeys } = useTranslation();

  const navigateTo = useMemo(() => (isAuth ? `${config.ROUTES.researcher}/account` : config.ROUTES.login), [isAuth]);
  const buttonText = useMemo(
    () => (isAuth ? getText(i18nKeys.ACCOUNT_BUTTON__ACCOUNT) : getText(i18nKeys.ACCOUNT_BUTTON__LOGIN)),
    [isAuth, getText, i18nKeys]
  );

  const handleAccountClick = useCallback(() => {
    navigate(navigateTo);
  }, [navigate, navigateTo]);

  return (
    <Button containerClassName="account-button" variant="outlined" text={buttonText} onClick={handleAccountClick} />
  );
};
