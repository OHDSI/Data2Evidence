import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader } from "@portal/components";
import { Researcher } from "../containers/researcher/Researcher";
import SystemAdmin from "../containers/systemadmin/SystemAdmin";
import Etl from "../containers/etl/Etl";
import NoAccess from "../containers/shared/NoAccess/NoAccess";
import { Logout } from "../containers/auth/Logout";
import { LoginSilent } from "../containers/auth/LoginSilent";
import { config } from "../config";
import { usePostLoginRedirectUri, useUser } from "../contexts";
import { ResultsDialogWithEventLister } from "../plugins/SystemAdmin/DQD/ResultsDialog/ResultsDialogWithEventListener";
import { DisclaimerDialog } from "../containers/shared/Legal/DisclaimerDialog";

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
    let defaultRoute = config.ROUTES.researcher;

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
            {user?.canAccessResearcherPortal && (
              <Route path={`${config.ROUTES.researcher}/*`} element={<Researcher />} />
            )}
            {user?.canAccessEtlPortal && <Route path={`${config.ROUTES.etl}/*`} element={<Etl />} />}
            <Route path={config.ROUTES.logout} element={<Logout />} />
            <Route path={config.ROUTES.noAccess} element={<NoAccess />} />
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
