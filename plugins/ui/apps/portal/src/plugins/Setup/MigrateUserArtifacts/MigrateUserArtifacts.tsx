import React, { FC, useCallback, useState } from "react";
import { Title } from "@portal/components";
import { api } from "../../../axios/api";
import { IMigrateCohortDefinitionResponse } from "../../../axios/d2e-webapi";
import { MigrateUserArtifactsItem } from "./MigrateUserArtifactsItem";
import "./MigrateUserArtifacts.scss";

export const MigrateUserArtifacts: FC = () => {
  const [result, setResult] = useState<IMigrateCohortDefinitionResponse>();
  const [errorMessage, setErrorMessage] = useState<string>();

  const handleMigrate = useCallback(async () => {
    setResult(undefined);
    setErrorMessage(undefined);

    try {
      const response = await api.d2eWebApi.migrateCohortDefinition();
      setResult(response);
    } catch (error: any) {
      setErrorMessage("Migration failed.");
    }
  }, []);

  return (
    <div className="migrate-user-artifacts">
      <div className="migrate-user-artifacts__header">
        <Title>Migrate user artifacts</Title>
      </div>
      <div className="migrate-user-artifacts__body">
        <div className="migrate-user-artifacts__description">Migrate user artifacts to webapi</div>
        <MigrateUserArtifactsItem
          name="Migrate atlas cohort definitions"
          result={result}
          errorMessage={errorMessage}
          onClick={handleMigrate}
        />
      </div>
    </div>
  );
};
