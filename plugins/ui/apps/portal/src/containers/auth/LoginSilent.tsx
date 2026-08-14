import React, { FC } from "react";
import { OidcLoginSilent } from "./oidc/OidcLoginSilent";

interface LoginSilentProps {
  onReady?: () => void;
}

export const LoginSilent: FC<LoginSilentProps> = ({ onReady }) => {
  return <OidcLoginSilent onReady={onReady} />;
};
