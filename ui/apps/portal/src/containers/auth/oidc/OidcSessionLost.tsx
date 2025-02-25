import React, { FC, useCallback } from "react";
import { Button } from "@portal/components";
import { oidcLogout } from "./oidc";
import "./OidcSessionLost.scss";
import { useTranslation } from "../../../contexts";

export const OidcSessionLost: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const handleLogout = useCallback(async () => {
    localStorage.clear();
    oidcLogout();
  }, []);

  return (
    <div className="oidc-session-lost">
      <div className="oidc-session-lost__title">Session expired</div>
      <div className="oidc-session-lost__description">Your session has expired</div>
      <div className="oidc-session-lost__actions">
        <Button text={getText(i18nKeys.OIDC_SESSION_LOST__BUTTON)} onClick={handleLogout} block />
      </div>
    </div>
  );
};
