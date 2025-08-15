import React, { FC, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Dialog, Button } from "@portal/components";
import { api } from "../../../axios/api";
import { ConfigTypes } from "../../../constant";
import Divider from "@mui/material/Divider";
import { useDisclaimer, useTranslation } from "../../../contexts";
import { config } from "../../../config";
import "./DisclaimerDialog.scss";
import { i18nKeys } from "../../../contexts/app-context/states";

export const DisclaimerDialog: FC = () => {
  const navigate = useNavigate();
  const { disclaimer, setIsDisclaimerAccepted } = useDisclaimer();
  const { getText } = useTranslation();
  const [configs, setConfigs] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const shouldOpen = disclaimer.shouldDisplay === true && !disclaimer.isDisclaimerAccepted;
  const handleAccept = useCallback(() => {
    setIsDisclaimerAccepted(true);
  }, [setIsDisclaimerAccepted]);

  const handleLogout = useCallback(() => {
    navigate(config.ROUTES.logout);
  }, [navigate]);

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const configs = await api.systemPortal.getConfigsByTypes([ConfigTypes.DISCLAIMER]);
      setConfigs({ ...configs });
    } catch (error: any) {
      // TODO: handle error
      // if ("message" in error) {
      //   setError({ message: error.message });
      // }
    } finally {
      setLoading(false);
    }
  }, [shouldOpen]);

  useEffect(() => {
    if (!shouldOpen) {
      return;
    }
    fetchConfigs();
  }, [shouldOpen]);

  return (
    <Dialog
      title={getText(i18nKeys.DISCLAIMER_DIALOG__TITLE)}
      className="disclaimer-dialog"
      open={shouldOpen}
      maxWidth="lg"
    >
      <div className="disclaimer-dialog__content">
        <ReactMarkdown>{configs[ConfigTypes.DISCLAIMER]}</ReactMarkdown>
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button variant="outlined" block onClick={handleLogout} text={getText(i18nKeys.ACCOUNT__LOGOUT)} />
        <Button block onClick={handleAccept} text={getText(i18nKeys.DISCLAIMER_DIALOG__ACCEPT)} />
      </div>
    </Dialog>
  );
};
