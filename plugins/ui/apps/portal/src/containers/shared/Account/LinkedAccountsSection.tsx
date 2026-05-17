import React from "react";
import { Button, Card } from "@portal/components";
import { useLinkedAccounts } from "../../../hooks/useLinkedAccounts";

export const LinkedAccountsSection: React.FC = () => {
  const { accounts, loading, linkPhysionet, refreshPhysionet, unlinkPhysionet } = useLinkedAccounts();
  const physionet = accounts.find(a => a.provider === "physionet");

  return (
    <section aria-label="Linked accounts" className="account__linked-accounts">
      <h3>Linked accounts</h3>
      <div className="account__linked-row">
        <strong>PhysioNet</strong>
        {loading ? (
          <span>Loading…</span>
        ) : physionet ? (
          <>
            <div>Linked as {physionet.username ?? "(unknown)"}</div>
            <div>
              Last synced:{" "}
              {physionet.lastSyncedAt
                ? new Date(physionet.lastSyncedAt).toLocaleString()
                : "never"}
            </div>
            {physionet.lastSyncError && (
              <div role="alert" className="account__linked-error">
                {physionet.lastSyncError}
              </div>
            )}
            <Button variant="outlined" text="Refresh now" onClick={refreshPhysionet} />
            <Button variant="outlined" text="Unlink" onClick={unlinkPhysionet} />
          </>
        ) : (
          <Button text="Link PhysioNet account" onClick={linkPhysionet} />
        )}
      </div>
    </section>
  );
};
