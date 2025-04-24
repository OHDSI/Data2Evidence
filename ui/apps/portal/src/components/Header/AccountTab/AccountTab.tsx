import React, { FC, useCallback, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { config } from "../../../config";
import { useTranslation } from "../../../contexts";
import "../Header.scss";

interface AccountTabProps {
  portalType: string;
}

export const AccountTab: FC<AccountTabProps> = ({ portalType }) => {
  const { getText, i18nKeys } = useTranslation();
  const location = useLocation();

  const getLink = useCallback(() => {
    if (portalType === "researcher") {
      return `${config.ROUTES.researcher}/account`;
    } else {
      return `${config.ROUTES.systemadmin}/account`;
    }
  }, [portalType]);

  const isActiveTab = useMemo(() => {
    if (location.pathname === getLink()) {
      return "header__menu-overview header__menu-item--active";
    } else {
      return "header__menu-overview";
    }
  }, [getLink, location.pathname]);

  return (
    <li className={isActiveTab}>
      <Link to={getLink()}>{getText(i18nKeys.ACCOUNT_TAB__LINK)}</Link>
    </li>
  );
};
