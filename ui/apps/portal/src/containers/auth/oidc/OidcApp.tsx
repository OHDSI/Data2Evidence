import React, { FC, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { OidcProvider, useOidc } from "@axa-fr/react-oidc";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { PublicApp } from "../../../apps/PublicApp";
import { PrivateApp } from "../../../apps/PrivateApp";
import { AppProvider, usePostLoginRedirectUri, useTranslation } from "../../../contexts";
import { isValidRedirectUrl } from "../../../utils";
import { OidcAuthenticating } from "./OidcAuthenticating";
import { OidcError } from "./OidcError";
import { OidcCallbackSuccess } from "./OidcCallbackSuccess";
import { OidcSessionLost } from "./OidcSessionLost";
import env from "../../../env";

let oidcConfig: any;
try {
  oidcConfig = JSON.parse(env.REACT_APP_IDP_OIDC_CONFIG.replaceAll("{window.location.origin}", window.location.origin));
} catch (err) {
  console.error(`Error when reading ${env.REACT_APP_IDP_OIDC_CONFIG}`);
}

const OidcAppInternal: FC = () => {
  const { changeLocale } = useTranslation();
  const { isAuthenticated } = useOidc();
  const location = useLocation();
  const { setPostLoginRedirectUri } = usePostLoginRedirectUri();

  useEffect(() => {
    if (!isAuthenticated && isValidRedirectUrl(location.pathname)) {
      setPostLoginRedirectUri(location.pathname);
    }
  }, [location.pathname, isAuthenticated]);

  useEffect(() => {
    if (env.REACT_APP_LOCALE) {
      changeLocale(env.REACT_APP_LOCALE);
    }
  }, []);

  if (!isAuthenticated) {
    return <PublicApp />;
  }

  return <PrivateApp />;
};

export const OidcApp: FC = () => {
  return (
    <OidcProvider
      configuration={oidcConfig}
      authenticatingComponent={OidcAuthenticating}
      authenticatingErrorComponent={OidcError}
      callbackSuccessComponent={OidcCallbackSuccess}
      sessionLostComponent={OidcSessionLost}
    >
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <AppProvider>
          <OidcAppInternal />
        </AppProvider>
      </LocalizationProvider>
    </OidcProvider>
  );
};
