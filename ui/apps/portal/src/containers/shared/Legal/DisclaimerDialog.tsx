import React, { FC, useCallback } from "react";
import { Dialog, Button, Title } from "@portal/components";
import Divider from "@mui/material/Divider";
import { useDisclaimer } from "../../../contexts";
import { LegalCard } from "./LegalCard";
import "./DisclaimerDialog.scss";

export const DisclaimerDialog: FC = () => {
  const { disclaimer, setIsDisclaimerAccepted } = useDisclaimer();

  const shouldOpen = disclaimer.shouldDisplay! && !disclaimer.isDisclaimerAccepted;
  const handleAccept = useCallback(() => {
    setIsDisclaimerAccepted(true);
  }, [setIsDisclaimerAccepted]);

  return (
    <Dialog title="Disclaimer" className="disclaimer-dialog" open={shouldOpen} maxWidth="lg">
      <div className="disclaimer-dialog__content">
        <LegalCard />
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button onClick={handleAccept} text="Accept" block />
      </div>
    </Dialog>
  );
};
