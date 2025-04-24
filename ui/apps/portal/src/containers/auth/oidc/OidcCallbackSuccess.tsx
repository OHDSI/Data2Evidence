import React, { FC } from "react";
import { Loader } from "@portal/components";
import { useTranslation } from "../../../contexts";

export const OidcCallbackSuccess: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  return <Loader text={getText(i18nKeys.OIDC_CALLBACK_SUCCESS__LOADER)} />;
};
