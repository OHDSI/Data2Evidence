import { FC, useEffect, useMemo } from "react";
import { useOidc } from "@axa-fr/react-oidc";

export const OidcRedirect: FC = () => {
  const { login } = useOidc();
  const extras = useMemo(() => {
    const searchParms = new URLSearchParams(window.location.search);
    return { id_token_hint: searchParms.get("id_token_hint") || "" };
  }, []);

  useEffect(() => {
    const loginSilent = async () => {
      await login(undefined, extras, true);
    };
    loginSilent();
  }, [login, extras]);

  return null;
};
