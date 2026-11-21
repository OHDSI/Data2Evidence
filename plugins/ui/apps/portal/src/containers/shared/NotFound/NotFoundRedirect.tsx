import React, { FC, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Loader } from "@portal/components";
import { isSingleSpaAppRoute, redirectToNotFound } from "../../../utils";

interface NotFoundRedirectProps {
  /** The portal section whose routes this catches, e.g. "researcher". Omit at the top level. */
  section?: string;
  /** Routes of that section's single-spa apps, which React Router does not know about. */
  appRoutes?: string[];
}

/**
 * The element of a catch-all route: sends a URL the portal has no page for to
 * the Atlas3 "Page not found" page (#2261), unless a single-spa app owns it.
 */
export const NotFoundRedirect: FC<NotFoundRedirectProps> = ({ section, appRoutes = [] }) => {
  const { pathname } = useLocation();
  const ownedByApp = section ? isSingleSpaAppRoute(pathname, section, appRoutes) : false;

  useEffect(() => {
    if (!ownedByApp) redirectToNotFound();
  }, [ownedByApp, pathname]);

  return ownedByApp ? null : <Loader />;
};
