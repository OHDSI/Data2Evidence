import React, { FC } from "react";
import { Navigate } from "react-router-dom";
import { config } from "../../config";
import { Redirect, hasIdTokenHint } from "../auth";

export const PublicRoot: FC = () => {
  const isRedirect = hasIdTokenHint();

  if (isRedirect) {
    // Redirect to IDP
    return <Redirect />;
  }

  // Skip the public overview and go straight to login when no active
  // OIDC session exists. This avoids the ~6s delay from the OIDC
  // library initializing its service worker on the public page before
  // deciding the user is unauthenticated.
  const hasSession = Object.keys(sessionStorage).some(
    (k) => k.startsWith("oidc.") || k.startsWith("oidc_")
  );
  if (!hasSession) {
    return <Navigate to={config.ROUTES.login} />;
  }

  return <Navigate to={config.ROUTES.public} />;
};
