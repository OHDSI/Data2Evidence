import { FC, useEffect } from "react";
import { oidcLogout } from "./oidc";
import { useToken, useUser } from "../../../contexts";

export const OidcLogout: FC = () => {
  const { clearUser } = useUser();
  const { clearToken } = useToken();

  useEffect(() => {
    const logout = async () => {
      localStorage.clear();
      clearUser();
      clearToken();
      await oidcLogout();
    };
    logout();
  }, [clearUser]);

  return null;
};
