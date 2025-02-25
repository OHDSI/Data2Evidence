import React, { FC, useEffect } from "react";
import { useOidc } from "@axa-fr/react-oidc";
import { Loader } from "@portal/components";

export const OidcLogin: FC = () => {
  const { login, isAuthenticated } = useOidc();

  useEffect(() => {
    if (!isAuthenticated) {
      login();
    }
  }, [isAuthenticated, login]);

  return <Loader />;
};
