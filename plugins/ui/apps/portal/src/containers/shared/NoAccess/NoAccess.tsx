import React, { FC, useCallback, useEffect } from "react";
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

  useEffect(() => {
    if (isAuthorized && userId) {
      navigate("/");
    }
  }, [navigate, isAuthorized, userId]);

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
