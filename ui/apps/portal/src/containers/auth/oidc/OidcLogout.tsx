import { FC, useEffect } from "react";
import { oidcLogout } from "./oidc";
import { useToken, useUser, useDisclaimer } from "../../../contexts";

export const OidcLogout: FC = () => {
  const { clearUser } = useUser();
  const { clearToken } = useToken();
  const { clearDisclaimer } = useDisclaimer();

  useEffect(() => {
    const logout = async () => {
      localStorage.clear();
      clearUser();
      clearToken();
      clearDisclaimer();
      await oidcLogout();
    };
    logout();
  }, [clearUser, clearToken, clearDisclaimer]);

  return null;
};
