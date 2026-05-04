import React, { FC } from "react";
import { useTranslation } from "../../../contexts";

export const OidcError: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  return <div style={{ padding: 10 }}>{getText(i18nKeys.OIDC_ERROR__MESSAGE)}</div>;
};
