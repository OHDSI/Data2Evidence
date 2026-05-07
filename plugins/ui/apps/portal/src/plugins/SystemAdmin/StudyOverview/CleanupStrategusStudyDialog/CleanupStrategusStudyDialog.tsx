import React, { FC, useCallback, useState } from "react";
import Divider from "@mui/material/Divider";
import { Button, Dialog } from "@portal/components";
import { api } from "../../../../axios/api";
import { NetworkStrategusStudy, Feedback, CloseDialogType } from "../../../../types";
import { i18nKeys } from "../../../../contexts/app-context/states";
import "./CleanupStrategusStudyDialog.scss";
import { useTranslation } from "../../../../contexts";

interface CleanupStrategusStudyDialogProps {
  study?: NetworkStrategusStudy;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const CleanupStrategusStudyDialog: FC<CleanupStrategusStudyDialogProps> = ({ study, open, onClose }) => {
  const { getText } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback>({});
  const [isCleaningUp, setIsCleaningUp] = useState<boolean>(false);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      typeof onClose === "function" && onClose(type);
    },
    [onClose, setFeedback]
  );

  const handleCleanupStudy = useCallback(async () => {
    if (isCleaningUp || !study?.studyId) {
      return;
    }

    setIsCleaningUp(true);

    try {
      await api.dataflow.createCleanUpStudySchemaRun(study.studyId);

      setFeedback({
        type: "success",
        message: getText(i18nKeys.CLEANUP_STRATEGUS_STUDY_DIALOG__SUCCESS_STUDY_CLEANUP, [study.studyId]),
        autoClose: 5000,
      });
    } catch (error) {
      console.error(`[${study.studyId}] Error cleaning up study:`, error);
      setFeedback({
        type: "error",
        message: getText(i18nKeys.CLEANUP_STRATEGUS_STUDY_DIALOG__ERROR_CLEANUP_STUDY, [study.studyId]),
        autoClose: 5000,
      });
    } finally {
      setIsCleaningUp(false);
    }
  }, [setFeedback, study, isCleaningUp, getText]);

  return (
    <Dialog
      className="cleanup-strategus-study-dialog"
      title={getText(i18nKeys.CLEANUP_STRATEGUS_STUDY_DIALOG__TITLE)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      <Divider />
      <div className="cleanup-strategus-study-dialog__content">
        <p className="cleanup-strategus-study-dialog__message">
          {getText(i18nKeys.CLEANUP_STRATEGUS_STUDY_DIALOG__CONFIRM_MESSAGE, [study?.studyId || ""])}
        </p>
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.CLEANUP_STRATEGUS_STUDY_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
        />
        <Button
          text={getText(i18nKeys.CLEANUP_STRATEGUS_STUDY_DIALOG__CLEANUP_STUDY)}
          onClick={handleCleanupStudy}
          block
          disabled={isCleaningUp || !study?.studyId}
        />
      </div>
    </Dialog>
  );
};

export default CleanupStrategusStudyDialog;
