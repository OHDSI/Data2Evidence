import React, { FC, ReactNode } from "react";
import { Spinner } from "ui-react";

/** Info banner with a spinner for an action in flight. Not the shared Alert, which always announces as role="alert". */
export const PendingBanner: FC<{ children: ReactNode }> = ({ children }) => (
  <div role="status" className="d2e-alert d2e-alert--info d2e-alert--inline ai-config-pending">
    {/* The spinner has its own status role; hidden so only the message is announced. */}
    <span aria-hidden="true">
      <Spinner size={20} />
    </span>
    {children}
  </div>
);
