import React, { FC, useMemo } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Researcher } from "../containers/researcher/Researcher";
import SystemAdmin from "../containers/systemadmin/SystemAdmin";
import NoAccess from "../containers/shared/NoAccess/NoAccess";
import { Logout } from "../containers/auth/Logout";
import { LoginSilent } from "../containers/auth/LoginSilent";
import { config } from "../config";
import { usePostLoginRedirectUri, useUser } from "../contexts";
import { TerminologyWithEventListener } from "../plugins/Researcher/Terminology/TerminologyWithEventListener";
import { ResultsDialogWithEventLister } from "../plugins/SystemAdmin/DQD/ResultsDialog/ResultsDialogWithEventListener";

export const PrivateApp: FC = () => {
  const { popPostLoginRedirectUri } = usePostLoginRedirectUri();
  const { user } = useUser();

  const defaultRoute = useMemo(() => {
    let defaultRoute = config.ROUTES.researcher;
    const postLoginRedirectUri = popPostLoginRedirectUri();

    if (!user) {
      defaultRoute = config.ROUTES.login;
    } else if (postLoginRedirectUri) {
      defaultRoute = postLoginRedirectUri;
    } else if (user.canAccessSystemAdminPortal && !user.isResearcher) {
      defaultRoute = config.ROUTES.systemadmin;
    } else if (!user.canAccessResearcherPortal && !user.canAccessSystemAdminPortal) {
      defaultRoute = config.ROUTES.noAccess;
    }

    return defaultRoute;
  }, [user, popPostLoginRedirectUri]);

  return (
    <div className="App">
      <TerminologyWithEventListener />
      <ResultsDialogWithEventLister />
      <LoginSilent />
      <Routes>
        {user?.canAccessSystemAdminPortal && (
          <Route path={`${config.ROUTES.systemadmin}/*`} element={<SystemAdmin />} />
        )}
        {user?.canAccessResearcherPortal && <Route path={`${config.ROUTES.researcher}/*`} element={<Researcher />} />}
        <Route path={config.ROUTES.logout} element={<Logout />} />
        <Route path={config.ROUTES.noAccess} element={<NoAccess />} />
        <Route path="/" element={<Navigate to={defaultRoute} />}>
          <Route path="public" element={<Navigate to={defaultRoute} />} />
          <Route path="login" element={<Navigate to={defaultRoute} />} />
        </Route>
      </Routes>
    </div>
  );
};
