import React, { FC, useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { OidcProvider, useOidc } from "@axa-fr/react-oidc";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { Feedback, Snackbar } from "@portal/components";
import { PublicApp } from "../../../apps/PublicApp";
import { PrivateApp } from "../../../apps/PrivateApp";
import { AppProvider, usePostLoginRedirectUri, useTranslation } from "../../../contexts";
import { i18nKeys } from "../../../contexts/app-context/states";
import { isValidRedirectUrl } from "../../../utils";
import { OidcAuthenticating } from "./OidcAuthenticating";
import { OidcError } from "./OidcError";
import { OidcCallbackSuccess } from "./OidcCallbackSuccess";
import { OidcSessionLost } from "./OidcSessionLost";
import { getOidcTokenPayload } from "./oidc";
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

const idpRelyingParty = env.REACT_APP_IDP_RELYING_PARTY;
const TOKEN_EVENTS = ["token_aquired", "token_renewed"];

export const OidcApp: FC = () => {
  const { getText } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback>({});

  const handleOidcEvent = useCallback(
    async (_configuration: string, name: string, _data: any) => {
      if (TOKEN_EVENTS.includes(name) && idpRelyingParty === "azure") {
        try {
          const decoded = await getOidcTokenPayload();
          if (!decoded || !("thirdPartyToken" in decoded)) {
            setFeedback({
              type: "error",
              message: getText(i18nKeys.OIDC_TOKEN__THIRD_PARTY_TOKEN_MISSING),
            });
          }
        } catch {
          console.error("Unable to get decoded token");
        }
      }
    },
    [setFeedback]
  );

  return (
    <OidcProvider
      configuration={oidcConfig}
      authenticatingComponent={OidcAuthenticating}
      authenticatingErrorComponent={OidcError}
      callbackSuccessComponent={OidcCallbackSuccess}
      sessionLostComponent={OidcSessionLost}
      onEvent={handleOidcEvent}
    >
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <AppProvider>
          <Snackbar
            type={feedback?.type}
            handleClose={() => setFeedback({})}
            message={feedback?.message}
            description={feedback?.description}
            visible={feedback?.message != null}
          />
          <OidcAppInternal />
        </AppProvider>
      </LocalizationProvider>
    </OidcProvider>
  );
};
