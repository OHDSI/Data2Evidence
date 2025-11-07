import React, { FC } from "react";
import { Navigate } from "react-router-dom";
import { config } from "../../config";
import { Redirect, hasIdTokenHint } from "../auth";

export const PublicRoot: FC = () => {
  const isRedirect = hasIdTokenHint();

  if (isRedirect) {
    // Redirect to IDP
    return <Redirect />;
  } else {
    // Route to public page
    return <Navigate to={config.ROUTES.public} />;
  }
};
