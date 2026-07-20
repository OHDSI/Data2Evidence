import React, { FC, useCallback, useState } from "react";
import { Button, CheckmarkIcon, CloseIcon } from "@portal/components";
import { IMigrateCohortDefinitionResponse } from "../../../axios/d2e-webapi";
import { useTranslation } from "../../../contexts";
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
  const { getText, i18nKeys } = useTranslation();
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
                    {getText(i18nKeys.MIGRATE_USER_ARTIFACTS__NO_ITEMS)}
                  </div>
                ) : (
                  <div className="migrate-user-artifacts-item__progress-step">
                    <CheckmarkIcon />
                    {getText(i18nKeys.MIGRATE_USER_ARTIFACTS__SUCCESS, [
                      `${result.successfulMigrations}`,
                      `${result.totalMigrations}`,
                    ])}
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
          <Button text={getText(i18nKeys.MIGRATE_USER_ARTIFACTS__RUN)} onClick={handleClick} loading={loading} />
        </div>
      )}
    </div>
  );
};
