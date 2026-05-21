import React from "react";
import { Button } from "@portal/components";
import { useLinkedAccounts } from "../../../hooks/useLinkedAccounts";
import { useTranslation } from "../../../contexts";
import { i18nKeys } from "../../../contexts/app-context/states";

export const LinkedAccountsSection: React.FC = () => {
  const { getText } = useTranslation();
  const { accounts, loading, error, disabled, linkPhysionet, refreshPhysionet, unlinkPhysionet } = useLinkedAccounts();
  const physionet = accounts.find(a => a.provider === "physionet");
  const title = getText(i18nKeys.LINKED_ACCOUNTS__TITLE);

  if (disabled) return null;

  return (
    <section aria-label={title} className="account__linked-accounts">
      <h3>{title}</h3>
      {error?.message && (
        <div role="alert" className="account__linked-error">
          {error.message}
        </div>
      )}
      <div className="account__linked-row">
        {loading ? (
          <span>{getText(i18nKeys.LINKED_ACCOUNTS__LOADING)}</span>
        ) : physionet ? (
          <>
            <strong>PhysioNet</strong>
            <div>
              {getText(i18nKeys.LINKED_ACCOUNTS__LINKED_AS, [
                physionet.username ?? getText(i18nKeys.LINKED_ACCOUNTS__UNKNOWN_USERNAME),
              ])}
            </div>
            <div>
              {getText(i18nKeys.LINKED_ACCOUNTS__LAST_SYNCED, [
                physionet.lastSyncedAt
                  ? new Date(physionet.lastSyncedAt).toLocaleString()
                  : getText(i18nKeys.LINKED_ACCOUNTS__NEVER),
              ])}
            </div>
            {physionet.lastSyncError && (
              <div role="alert" className="account__linked-error">
                {physionet.lastSyncError}
              </div>
            )}
            <Button block variant="outlined" text={getText(i18nKeys.LINKED_ACCOUNTS__REFRESH_NOW)} onClick={refreshPhysionet} />
            <Button block variant="outlined" text={getText(i18nKeys.LINKED_ACCOUNTS__UNLINK)} onClick={unlinkPhysionet} />
          </>
        ) : (
          <Button block text={getText(i18nKeys.LINKED_ACCOUNTS__LINK_PHYSIONET)} onClick={linkPhysionet} />
        )}
      </div>
    </section>
  );
};
