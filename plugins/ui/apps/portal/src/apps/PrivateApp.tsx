import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader } from "@portal/components";
import SystemAdmin from "../containers/systemadmin/SystemAdmin";
import Etl from "../containers/etl/Etl";
import NoAccess from "../containers/shared/NoAccess/NoAccess";
import { Logout } from "../containers/auth/Logout";
import { LoginSilent } from "../containers/auth/LoginSilent";
import { config } from "../config";
import { usePostLoginRedirectUri, useTranslation, useUser } from "../contexts";
import { ResultsDialogWithEventLister } from "../plugins/SystemAdmin/DQD/ResultsDialog/ResultsDialogWithEventListener";
import { DisclaimerDialog } from "../containers/shared/Legal/DisclaimerDialog";
import { AtlasAccount } from "../containers/shared/Account/AtlasAccount";

// Retired researcher routes render this notice (HTTP 200, SPA-level — never
// the researcher UI or a blank page), with a way forward to Atlas.
const PortalUnavailable: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 500, marginBottom: "1em" }}>
        {getText(i18nKeys.PORTAL_UNAVAILABLE__TITLE)}
      </div>
      <div>{getText(i18nKeys.PORTAL_UNAVAILABLE__INFO)}</div>
      <div style={{ marginTop: "1em" }}>
        <a href={`${window.location.origin}/atlas/`}>{getText(i18nKeys.PORTAL_UNAVAILABLE__GO_TO_ATLAS)}</a>
      </div>
    </div>
  );
};

// Atlas is served outside the portal basename (/d2e/portal), so react-router's
// Navigate cannot reach it — a full-page replace is required.
const RedirectToAtlas: FC = () => {
  useEffect(() => {
    window.location.replace(`${window.location.origin}/atlas/`);
  }, []);
  return <Loader />;
};

export const PrivateApp: FC = () => {
  const { postLoginRedirectUri, clearPostLoginRedirectUri } = usePostLoginRedirectUri();
  const { user } = useUser();

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const handleReady = useCallback(() => setIsBootstrapping(false), []);

  useEffect(() => {
    if (!isBootstrapping && postLoginRedirectUri) {
      clearPostLoginRedirectUri();
    }
  }, [isBootstrapping, postLoginRedirectUri, clearPostLoginRedirectUri]);

  const defaultRoute = useMemo(() => {
    // Researcher landing is retired: users who previously landed on the
    // researcher portal now land on Atlas (served outside this SPA).
    let defaultRoute = "/atlas";

    if (!user) {
      defaultRoute = config.ROUTES.login;
    } else if (postLoginRedirectUri) {
      defaultRoute = postLoginRedirectUri;
    } else if (user.canAccessSystemAdminPortal && !user.isResearcher) {
      defaultRoute = config.ROUTES.systemadmin;
    } else if (!user.canAccessResearcherPortal && !user.canAccessSystemAdminPortal && user.canAccessEtlPortal) {
      defaultRoute = config.ROUTES.etl;
    } else if (!user.canAccessResearcherPortal && !user.canAccessSystemAdminPortal) {
      defaultRoute = config.ROUTES.noAccess;
    }

    return defaultRoute;
  }, [user, postLoginRedirectUri]);

  return (
    <div className="App">
      <LoginSilent onReady={handleReady} />
      {isBootstrapping ? (
        <Loader />
      ) : (
        <>
          <ResultsDialogWithEventLister />
          <DisclaimerDialog />
          <Routes>
            {user?.canAccessSystemAdminPortal && (
              <Route path={`${config.ROUTES.systemadmin}/*`} element={<SystemAdmin />} />
            )}
            {/* Retired researcher routes: always render the unavailable page,
                never the researcher UI, regardless of role. */}
            <Route path={`${config.ROUTES.researcher}/*`} element={<PortalUnavailable />} />
            {user?.canAccessEtlPortal && <Route path={`${config.ROUTES.etl}/*`} element={<Etl />} />}
            {user?.canAccessResearcherPortal && <Route path={config.ROUTES.atlasAccount} element={<AtlasAccount />} />}
            <Route path={config.ROUTES.logout} element={<Logout />} />
            <Route path={config.ROUTES.noAccess} element={<NoAccess />} />
            <Route path="/atlas" element={<RedirectToAtlas />} />
            <Route path="/" element={<Navigate to={defaultRoute} />}>
              <Route path="public" element={<Navigate to={defaultRoute} />} />
              <Route path="login" element={<Navigate to={defaultRoute} />} />
            </Route>
          </Routes>
        </>
      )}
    </div>
  );
};
