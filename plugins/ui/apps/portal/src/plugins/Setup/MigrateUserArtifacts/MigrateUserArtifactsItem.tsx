import React, { FC, useCallback, useState } from "react";
import { Button, CheckmarkIcon, CloseIcon } from "@portal/components";
import { IMigrateCohortDefinitionResponse } from "../../../axios/d2e-webapi";
import "./MigrateUserArtifactsItem.scss";

interface MigrateUserArtifactsItemProps {
  name: string;
  result?: IMigrateCohortDefinitionResponse;
  errorMessage?: string;
  onClick?: () => Promise<void>;
}

export const MigrateUserArtifactsItem: FC<MigrateUserArtifactsItemProps> = ({
  name,
  result,
  errorMessage,
  onClick,
}) => {
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    try {
      setLoading(true);
      typeof onClick === "function" && (await onClick());
    } finally {
      setLoading(false);
    }
  }, [onClick]);

  return (
    <div className="migrate-user-artifacts-item">
      <div className="migrate-user-artifacts-item__info">
        <div className="migrate-user-artifacts-item__title">
          <div>{name}</div>
          {(result || errorMessage) && (
            <div className="migrate-user-artifacts-item__progress">
              {result &&
                (result.totalMigrations === 0 ? (
                  <div className="migrate-user-artifacts-item__progress-step">
                    <CheckmarkIcon />
                    No atlas cohort definitions user artifacts to migrate
                  </div>
                ) : (
                  <div className="migrate-user-artifacts-item__progress-step">
                    <CheckmarkIcon />
                    Successfully migrated {result.successfulMigrations}/{result.totalMigrations} atlas cohort
                    definitions
                  </div>
                ))}
              {errorMessage && (
                <div className="migrate-user-artifacts-item__progress-step migrate-user-artifacts-item__progress-step--error">
                  <CloseIcon />
                  {errorMessage}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {onClick && (
        <div className="migrate-user-artifacts-item__action">
          <Button text="Migrate" onClick={handleClick} loading={loading} />
        </div>
      )}
    </div>
  );
};
