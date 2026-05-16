import React, { FC, useCallback, useState } from "react";
import Divider from "@mui/material/Divider";
import { Button, Dialog } from "@portal/components";
import { api } from "../../../../axios/api";
import { Study, Feedback, CloseDialogType } from "../../../../types";
import "./TransformToWebApiDialog.scss";
import { useTranslation } from "../../../../contexts";

interface TransformToWebApiDialogProps {
  study?: Study;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const TransformToWebApiDialog: FC<TransformToWebApiDialogProps> = ({ study, open, onClose }) => {
  const { getText, i18nKeys } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback>({});
  const [loading, setLoading] = useState(false);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleConfirm = useCallback(async () => {
    if (study == null) return;

    try {
      setLoading(true);
      setFeedback({});
      const result = await api.systemPortal.transformToWebApi(study.id);
      if (result?.transformed === false) {
        setFeedback({
          type: "success",
          message: result.reason ?? "Dataset is already WebAPI-managed.",
        });
        return;
      }
      handleClose("success");
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.data?.message || err?.message || "Transform failed.",
      });
      console.error("Error when converting dataset to WebAPI", err);
    } finally {
      setLoading(false);
    }
  }, [study, handleClose]);

  return (
    <Dialog
      className="transform-to-webapi-dialog"
      title={getText(i18nKeys.TRANSFORM_TO_WEBAPI__TITLE)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      <Divider />
      <div className="transform-to-webapi-dialog__content">
        <div className="transform-to-webapi-dialog__content-text">
          <div>{getText(i18nKeys.TRANSFORM_TO_WEBAPI__BODY)}</div>
          {study && (
            <div style={{ marginTop: "16px" }}>
              <strong>&quot;{study.studyDetail?.name ?? study.id}&quot;</strong>
            </div>
          )}
        </div>
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.DELETE_STUDY_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
          disabled={loading}
        />
        <Button
          text={getText(i18nKeys.ACTION_SELECTOR__TRANSFORM_TO_WEBAPI)}
          onClick={handleConfirm}
          block
          loading={loading}
        />
      </div>
    </Dialog>
  );
};

export default TransformToWebApiDialog;
