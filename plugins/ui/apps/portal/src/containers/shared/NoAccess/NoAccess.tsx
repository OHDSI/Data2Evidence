import React, { FC, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Loader } from "@portal/components";
import { config } from "../../../config";
import { useTranslation, useUser } from "../../../contexts";
import "./NoAccess.scss";

const NoAccess: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const { user, userId } = useUser();
  const isAuthorized = user.canAccessResearcherPortal || user.canAccessSystemAdminPortal;
  const navigate = useNavigate();
  const retried = useRef(false);

  useEffect(() => {
    if (isAuthorized && userId) {
      navigate("/");
    }
  }, [navigate, isAuthorized, userId]);

  // On first federated login, auto-provisioning may still be committing
  // roles when this page renders. A single page reload after a short
  // delay lets the backend settle and the portal re-evaluate roles.
  useEffect(() => {
    if (retried.current || isAuthorized) return;
    retried.current = true;
    const key = "d2e_no_access_retry";
    if (sessionStorage.getItem(key)) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, "1");
    const timer = setTimeout(() => window.location.reload(), 3000);
    return () => clearTimeout(timer);
  }, [isAuthorized]);

  const handleLogout = useCallback(() => {
    navigate(config.ROUTES.logout);
  }, [navigate]);

  if (userId == null || user == null) return <Loader />;

  return (
    <div className="no-access">
      <div className="no-access__title">{getText(i18nKeys.NO_ACCESS__ACCESS_DENIED)}</div>
      <div className="no-access__description">{getText(i18nKeys.NO_ACCESS__INFO)}</div>
      <div className="no-access__actions">
        <Button text="Logout" onClick={handleLogout} block />
      </div>
    </div>
  );
};

export default NoAccess;
