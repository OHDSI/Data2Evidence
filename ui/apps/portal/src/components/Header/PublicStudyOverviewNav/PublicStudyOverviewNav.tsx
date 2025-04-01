import React, { FC, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { config } from "../../../config";
import { useTranslation } from "../../../contexts";
import "../Header.scss";

const PublicStudyOverviewNav: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const location = useLocation();

  const isActiveTab = useCallback(
    (): string =>
      location.pathname === `${config.ROUTES.public}/information`
        ? "header__menu-overview header__menu-item--active"
        : "header__menu-overview",
    [location.pathname]
  );

  return (
    <li className={isActiveTab()}>
      <Link to={`${config.ROUTES.public}/information`} data-text="Dataset" className="overview-title">
        {getText(i18nKeys.PUBLIC_STUDY_OVERVIEW_NAV__DATASET)}
      </Link>
    </li>
  );
};

export default PublicStudyOverviewNav;
