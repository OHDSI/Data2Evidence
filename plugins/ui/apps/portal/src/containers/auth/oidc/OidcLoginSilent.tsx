import { FC, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOidc, useOidcAccessToken, useOidcIdToken } from "@axa-fr/react-oidc";
import { api } from "../../../axios/api";
import { config } from "../../../config";
import { useToken, useUser } from "../../../contexts";
import { useDisclaimerHook } from "../../../hooks/useDisclaimer";
import env from "../../../env";

const subProp = env.REACT_APP_IDP_SUBJECT_PROP;

const RELOGIN_GUARD_KEY = "d2e_first_login_role_refresh";

interface OidcLoginSilentProps {
  onReady?: () => void;
}

let firstTimeLoggedIn = false;
let bootstrapSettled = false;

export const OidcLoginSilent: FC<OidcLoginSilentProps> = ({ onReady }) => {
  const navigate = useNavigate();
  const { idToken, idTokenPayload } = useOidcIdToken();
  const { accessTokenPayload } = useOidcAccessToken();
  const { login } = useOidc();
  const { setIdToken, setIdTokenClaim } = useToken();
  const { setUserGroup, clearUser } = useUser();
  useDisclaimerHook();

  const loggedIn = useCallback(
    async (idpUserId: string) => {
      try {
        const userGroups = await api.userMgmt.getUserGroupList(idpUserId, true);
        const currentRoles = (accessTokenPayload as { roles?: string[] } | undefined)?.roles;
        const tokenMissingRoles = (currentRoles?.length || 0) === 0;
        const alreadyReloggedIn = sessionStorage.getItem(RELOGIN_GUARD_KEY) === "1";

        if (tokenMissingRoles && !alreadyReloggedIn) {
          console.info("[OidcLoginSilent] token has no roles after sync; re-login to refresh claims");
          sessionStorage.setItem(RELOGIN_GUARD_KEY, "1");
          login();

          await new Promise<void>((resolve) => setTimeout(resolve, 8000));
          return;
        }

        sessionStorage.removeItem(RELOGIN_GUARD_KEY);
        setUserGroup(idpUserId, userGroups);

        await api.userMgmt.syncWebApiRoles().catch((err) => console.warn("WebAPI role sync failed", err));
      } catch (err: any) {
        console.error("Error getting user info on login", err);
        sessionStorage.removeItem(RELOGIN_GUARD_KEY);
        clearUser();
        navigate(err?.status === 403 ? config.ROUTES.noAccess : config.ROUTES.logout);
      }
    },
    [navigate, setUserGroup, clearUser, login, accessTokenPayload]
  );

  useEffect(() => {
    setIdToken(idToken);
    setIdTokenClaim(idTokenPayload);

    if (!firstTimeLoggedIn) {
      const idpUserId = idTokenPayload?.[subProp];
      if (idpUserId) {
        firstTimeLoggedIn = true;
        loggedIn(idpUserId).finally(() => {
          bootstrapSettled = true;
          onReady?.();
        });
      }
      return;
    }

    if (bootstrapSettled) {
      onReady?.();
    }
  }, [idToken, idTokenPayload, loggedIn, onReady]);

  return null;
};
