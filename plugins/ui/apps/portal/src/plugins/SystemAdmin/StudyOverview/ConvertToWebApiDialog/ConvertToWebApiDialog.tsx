import React, { FC, useCallback, useState } from "react";
import Divider from "@mui/material/Divider";
import { Button, Dialog } from "@portal/components";
import { api } from "../../../../axios/api";
import { Study, Feedback, CloseDialogType } from "../../../../types";
import { useTranslation } from "../../../../contexts";
import "./ConvertToWebApiDialog.scss";

interface ConvertToWebApiDialogProps {
  study?: Study;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const ConvertToWebApiDialog: FC<ConvertToWebApiDialogProps> = ({ study, open, onClose }) => {
  const { getText, i18nKeys } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback>({});
  const [converting, setConverting] = useState(false);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleConvert = useCallback(async () => {
    if (study == null) return;
    try {
      setConverting(true);
      await api.systemPortal.convertDatasetToWebApi(study.id);
      handleClose("success");
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: getText(i18nKeys.CONVERT_TO_WEBAPI_DIALOG__ERROR),
        description: err.data?.message || err.data || err.message,
      });
      console.error("Error converting dataset to WebAPI source", err);
    } finally {
      setConverting(false);
    }
  }, [study, handleClose, getText, i18nKeys]);

  return (
    <Dialog
      className="convert-to-webapi-dialog"
      title={getText(i18nKeys.CONVERT_TO_WEBAPI_DIALOG__TITLE)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      <Divider />
      <div className="convert-to-webapi-dialog__content">
        <div>{getText(i18nKeys.CONVERT_TO_WEBAPI_DIALOG__BODY)}</div>
        {study && (
          <div className="convert-to-webapi-dialog__name">
            &quot;{study.studyDetail?.name || study.id}&quot;
          </div>
        )}
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.CONVERT_TO_WEBAPI_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
          disabled={converting}
        />
        <Button
          text={getText(i18nKeys.CONVERT_TO_WEBAPI_DIALOG__CONFIRM)}
          onClick={handleConvert}
          block
          loading={converting}
        />
      </div>
    </Dialog>
  );
};

export default ConvertToWebApiDialog;
