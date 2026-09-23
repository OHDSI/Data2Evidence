import { FC, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOidcAccessToken, useOidcIdToken } from "@axa-fr/react-oidc";
import { api } from "../../../axios/api";
import { config } from "../../../config";
import { useToken, useUser } from "../../../contexts";
import { useDisclaimerHook } from "../../../hooks/useDisclaimer";
import env from "../../../env";
import { refreshAuthToken } from "../auth";
import { getOidcTokenPayload } from "./oidc";

const subProp = env.REACT_APP_IDP_SUBJECT_PROP;

const MAX_REFRESH_ATTEMPTS = 3;
const REFRESH_RETRY_DELAY_MS = 1500;

// Portal access gate, mirroring contexts/.../use-user.ts.
const hasPortalAccess = (userGroups?: { alp_role_study_researcher?: string[]; alp_role_tenant_viewer?: string[] }) =>
  (userGroups?.alp_role_study_researcher?.length || 0) > 0 || (userGroups?.alp_role_tenant_viewer?.length || 0) > 0;

interface OidcLoginSilentProps {
  onReady?: () => void;
}

let firstTimeLoggedIn = false;
let bootstrapSettled = false;
let bootstrapFailed = false;
let lastAttemptedAccessTokenIat: number | null | undefined = null;

export const OidcLoginSilent: FC<OidcLoginSilentProps> = ({ onReady }) => {
  const navigate = useNavigate();
  const { idToken, idTokenPayload } = useOidcIdToken();
  const { accessTokenPayload } = useOidcAccessToken();
  const { setIdToken, setIdTokenClaim } = useToken();
  const { setUserGroup, clearUser } = useUser();
  useDisclaimerHook();

  const loggedIn = useCallback(
    async (idpUserId: string, isFirstLogin: boolean) => {
      try {
        // `sync:true` grants entitlements (e.g. the PhysioNet dataset-researcher role) in Logto.
        let userGroups = await api.userMgmt.getUserGroupList(idpUserId, true);
        setUserGroup(idpUserId, userGroups);

        // On a first login the response derives from the caller's pre-grant token (role source = logto),
        // so it doesn't yet reflect the grant. Refresh + re-fetch, bounded, until the fresh mint shows it.
        if (isFirstLogin && !hasPortalAccess(userGroups)) {
          for (let attempt = 0; attempt < MAX_REFRESH_ATTEMPTS && !hasPortalAccess(userGroups); attempt++) {
            if (attempt > 0) await new Promise<void>((resolve) => setTimeout(resolve, REFRESH_RETRY_DELAY_MS));
            await refreshAuthToken();
            lastAttemptedAccessTokenIat = ((await getOidcTokenPayload()) as { iat?: number } | undefined)?.iat;
            userGroups = await api.userMgmt.getUserGroupList(idpUserId, true);
            setUserGroup(idpUserId, userGroups);
          }
        }

        await api.userMgmt.syncWebApiRoles().catch((err) => console.warn("WebAPI role sync failed", err));
      } catch (err: any) {
        console.error("Error getting user info on login", err);
        bootstrapFailed = true;
        clearUser();
        navigate(err?.status === 403 ? config.ROUTES.noAccess : config.ROUTES.logout);
      }
    },
    [navigate, setUserGroup, clearUser]
  );

  const accessTokenIat = (accessTokenPayload as { iat?: number } | undefined)?.iat;

  useEffect(() => {
    setIdToken(idToken);
    setIdTokenClaim(idTokenPayload);

    const idpUserId = idTokenPayload?.[subProp];
    const isNewToken = accessTokenIat !== lastAttemptedAccessTokenIat;
    const needsSync = idpUserId && isNewToken;

    if (needsSync) {
      const isFirstLogin = !firstTimeLoggedIn || bootstrapFailed;
      firstTimeLoggedIn = true;
      bootstrapFailed = false;
      lastAttemptedAccessTokenIat = accessTokenIat;
      loggedIn(idpUserId, isFirstLogin).finally(() => {
        bootstrapSettled = true;
        onReady?.();
      });
      return;
    }

    if (bootstrapSettled) {
      onReady?.();
    }
  }, [idToken, idTokenPayload, accessTokenIat, loggedIn, onReady]);

  return null;
};
