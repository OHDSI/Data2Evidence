import React, { FC, useCallback, useState } from "react";
import { Title } from "@portal/components";
import { api } from "../../../axios/api";
import { useTranslation } from "../../../contexts";
import { IMigrateCohortDefinitionResponse } from "../../../axios/d2e-webapi";
import { MigrateUserArtifactsItem } from "./MigrateUserArtifactsItem";
import "./MigrateUserArtifacts.scss";

export const MigrateUserArtifacts: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const [result, setResult] = useState<IMigrateCohortDefinitionResponse>();
  const [errorMessage, setErrorMessage] = useState<string>();

  const handleMigrate = useCallback(async () => {
    setResult(undefined);
    setErrorMessage(undefined);

    try {
      const response = await api.d2eWebApi.migrateCohortDefinition();
      setResult(response);
    } catch (error: any) {
      setErrorMessage(getText(i18nKeys.MIGRATE_USER_ARTIFACTS__ERROR));
    }
  }, [getText, i18nKeys.MIGRATE_USER_ARTIFACTS__ERROR]);

  return (
    <div className="migrate-user-artifacts">
      <div className="migrate-user-artifacts__header">
        <Title>{getText(i18nKeys.MIGRATE_USER_ARTIFACTS__TITLE)}</Title>
      </div>
      <div className="migrate-user-artifacts__body">
        <div className="migrate-user-artifacts__description">
          {getText(i18nKeys.MIGRATE_USER_ARTIFACTS__DESCRIPTION)}
        </div>
        <MigrateUserArtifactsItem
          name={getText(i18nKeys.MIGRATE_USER_ARTIFACTS__ITEM_NAME)}
          result={result}
          errorMessage={errorMessage}
          onClick={handleMigrate}
        />
      </div>
    </div>
  );
};
