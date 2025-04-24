import React, { FC, useCallback, useState } from "react";
import { PageProps, SystemAdminPageMetadata } from "@portal/plugin";
import "./SystemAdminPage.scss";
import { useTranslation } from "../../../contexts";

interface SystemAdminPageProps extends PageProps<SystemAdminPageMetadata> {}

export const SystemAdminPage: FC<SystemAdminPageProps> = ({ metadata }) => {
  const { getText, i18nKeys } = useTranslation();
  const [token, setToken] = useState<string>();

  const handleClick = useCallback(async () => {
    if (metadata) {
      setToken(await metadata.getToken());
    }
  }, [metadata]);

  return (
    <div className="sa-plugin">
      <h1>{getText(i18nKeys.SYSTEM_ADMIN_PAGE__TITLE)}</h1>
      <header>
        <div className="sa-plugin__subtitle">{getText(i18nKeys.SYSTEM_ADMIN_PAGE__SUBTITLE)}</div>
        <div className="sa-plugin__description">
          {getText(i18nKeys.SYSTEM_ADMIN_PAGE__HELLO, [metadata?.userId || "there!"])}
        </div>
      </header>
      <nav>{getText(i18nKeys.SYSTEM_ADMIN_PAGE__SIDE_NAV)}</nav>
      <section>
        <button onClick={handleClick}>{getText(i18nKeys.SYSTEM_ADMIN_PAGE__GET_JWT_TOKEN)}</button>
        <div>{token}</div>
      </section>
    </div>
  );
};
