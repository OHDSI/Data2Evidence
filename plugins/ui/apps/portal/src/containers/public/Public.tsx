import React, { FC, useMemo } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import classNames from "classnames";
import { Header } from "../../components";
import { FeedbackToast } from "../shared/FeedbackToast/FeedbackToast";
import { PublicOverview } from "./PublicOverview/PublicOverview";
import { PublicInformation } from "./PublicInformation/PublicInformation";
import { Legal } from "../shared/Legal/Legal";
import { useTranslation } from "../../contexts";
import { NavLink } from "../../types";
import "./Public.scss";

const ROUTES = {
  overview: "overview",
  info: "information",
  legal: "legal",
  login: "/login",
  logout: "/logout",
};

export const Public: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const location = useLocation();
  const isHome = location.pathname === "/public" || location.pathname === "/public/overview";
  const classes = classNames("public__container", { "public__container--home": isHome });

  const navigations: NavLink[] = useMemo(
    () => [
      {
        id: "legal",
        path: ROUTES.legal,
        title: getText(i18nKeys.PUBLIC__NAVIGATION_LEGAL),
      },
      {
        id: "login",
        path: ROUTES.login,
        title: getText(i18nKeys.PUBLIC__NAVIGATION_LOGIN),
      },
    ],
    [getText, i18nKeys]
  );

  return (
    <div className={classes}>
      {!isHome && <Header nav={navigations} portalType="public" />}
      <main>
        <FeedbackToast />
        <Routes>
          <Route path="/">
            <Route index element={<Navigate to={ROUTES.overview} />} />
            <Route path={ROUTES.info} element={<PublicInformation />} />
            <Route path={ROUTES.legal} element={<Legal />} />
            <Route path={ROUTES.overview} element={<PublicOverview />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
};
