import { FC, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOidcIdToken } from "@axa-fr/react-oidc";
import { api } from "../../../axios/api";
import { config } from "../../../config";
import { useToken, useUser } from "../../../contexts";
import { useDisclaimerHook } from "../../../hooks/useDisclaimer";
import env from "../../../env";

const subProp = env.REACT_APP_IDP_SUBJECT_PROP;

let firstTimeLoggedIn = false;
export const OidcLoginSilent: FC = () => {
  const navigate = useNavigate();
  const { idToken, idTokenPayload } = useOidcIdToken();
  const { setIdToken, setIdTokenClaim } = useToken();
  const { setUserGroup, clearUser } = useUser();
  useDisclaimerHook();

  const loggedIn = useCallback(
    async (idpUserId: string | undefined) => {
      if (idpUserId) {
        // On first federated login, auto-provisioning runs inside the
        // user-group/list middleware. Concurrent portal requests can race
        // and fail with 500 until provisioning commits. Retry with backoff.
        let lastErr: any;
        for (let attempt = 0; attempt < 4; attempt++) {
          try {
            if (attempt > 0) {
              await new Promise((r) => setTimeout(r, attempt * 1500));
            }
            const sync = attempt === 0;
            const userGroups = await api.userMgmt.getUserGroupList(idpUserId, sync);
            const hasRole = userGroups?.alp_role_study_researcher?.length > 0
              || userGroups?.alp_role_tenant_viewer?.length > 0
              || userGroups?.alp_role_system_admin
              || userGroups?.alp_role_user_admin;
            if (hasRole || attempt === 3) {
              setUserGroup(idpUserId, userGroups);
              return;
            }
          } catch (err: any) {
            lastErr = err;
            if (err?.status === 403) break;
          }
        }
        console.error("Error when getting user info after retries", lastErr);
        navigate(lastErr?.status === 403 ? config.ROUTES.noAccess : config.ROUTES.logout);
        clearUser();
      }
    },
    [navigate, setUserGroup, clearUser]
  );

  useEffect(() => {
    setIdToken(idToken);
    setIdTokenClaim(idTokenPayload);

    if (!firstTimeLoggedIn) {
      firstTimeLoggedIn = true;
      const idpUserId = idTokenPayload[subProp];
      loggedIn(idpUserId);
    }
  }, [idToken, idTokenPayload, loggedIn]);

  return null;
};
