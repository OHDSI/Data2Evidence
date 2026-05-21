import React from "react";
import { Button, Card } from "@portal/components";
import { useLinkedAccounts } from "../../../hooks/useLinkedAccounts";
import { useTranslation } from "../../../contexts";
import { i18nKeys } from "../../../contexts/app-context/states";

export const LinkedAccountsSection: React.FC = () => {
  const { getText } = useTranslation();
  const { accounts, loading, error, linkPhysionet, refreshPhysionet, unlinkPhysionet } = useLinkedAccounts();
  const physionet = accounts.find(a => a.provider === "physionet");
  const title = getText(i18nKeys.LINKED_ACCOUNTS__TITLE);

  return (
    <section aria-label={title} className="account__linked-accounts">
      <h3>{title}</h3>
      {error?.message && (
        <div role="alert" className="account__linked-error">
          {error.message}
        </div>
      )}
      <div className="account__linked-row">
        <strong>PhysioNet</strong>
        {loading ? (
          <span>{getText(i18nKeys.LINKED_ACCOUNTS__LOADING)}</span>
        ) : physionet ? (
          <>
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
            <Button variant="outlined" text={getText(i18nKeys.LINKED_ACCOUNTS__REFRESH_NOW)} onClick={refreshPhysionet} />
            <Button variant="outlined" text={getText(i18nKeys.LINKED_ACCOUNTS__UNLINK)} onClick={unlinkPhysionet} />
          </>
        ) : (
          <Button text={getText(i18nKeys.LINKED_ACCOUNTS__LINK_PHYSIONET)} onClick={linkPhysionet} />
        )}
      </div>
    </section>
  );
};
