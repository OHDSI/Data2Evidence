import { FC, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOidcIdToken } from "@axa-fr/react-oidc";
import { api } from "../../../axios/api";
import { config } from "../../../config";
import { useToken, useUser } from "../../../contexts";
import env from "../../../env";

const subProp = env.REACT_APP_IDP_SUBJECT_PROP;

let firstTimeLoggedIn = false;
export const OidcLoginSilent: FC = () => {
  const navigate = useNavigate();
  const { idToken, idTokenPayload } = useOidcIdToken();
  const { setIdToken, setIdTokenClaim } = useToken();
  const { setUserGroup, clearUser } = useUser();

  const loggedIn = useCallback(
    async (idpUserId: string | undefined) => {
      if (idpUserId) {
        try {
          const userGroups = await api.userMgmt.getUserGroupList(idpUserId);
          setUserGroup(idpUserId, userGroups);
        } catch (err: any) {
          console.error("Error when getting user info", err);
          navigate(err?.status === 403 ? config.ROUTES.noAccess : config.ROUTES.logout);
          clearUser();
        }
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
