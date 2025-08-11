import React, { FC, useCallback } from "react";
import { Dialog, Button } from "@portal/components";
import Divider from "@mui/material/Divider";
import { useDisclaimer, useTranslation } from "../../../contexts";
import { LegalCard } from "./LegalCard";
import "./DisclaimerDialog.scss";
import { i18nKeys } from "../../../contexts/app-context/states";

export const DisclaimerDialog: FC = () => {
  const { disclaimer, setIsDisclaimerAccepted } = useDisclaimer();
  const { getText } = useTranslation();

  const shouldOpen = disclaimer.shouldDisplay === true && !disclaimer.isDisclaimerAccepted;
  const handleAccept = useCallback(() => {
    setIsDisclaimerAccepted(true);
  }, [setIsDisclaimerAccepted]);

  return (
    <Dialog
      title={getText(i18nKeys.DISCLAIMER_DIALOG__TITLE)}
      className="disclaimer-dialog"
      open={shouldOpen}
      maxWidth="lg"
    >
      <div className="disclaimer-dialog__content">
        <LegalCard />
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button onClick={handleAccept} text={i18nKeys.DISCLAIMER_DIALOG__ACCEPT} block />
      </div>
    </Dialog>
  );
};
