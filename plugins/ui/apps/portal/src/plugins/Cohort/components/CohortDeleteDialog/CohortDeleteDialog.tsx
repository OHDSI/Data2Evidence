import React, { FC, useCallback, useState } from "react";
import { Feedback } from "../../../../types";
import { CohortMapping } from "../../../../types/cohort";
import Divider from "@mui/material/Divider";
import { Button, Dialog } from "@portal/components";
import { Loader } from "@portal/components";
import { CohortMgmt } from "../../../../axios/cohort-mgmt";
import "./CohortDeleteDialog.scss";
import { useTranslation } from "../../../../contexts";
interface CohortDeleteDialogProps {
  cohort?: CohortMapping;
  cohortMgmtClient: CohortMgmt;
  open: boolean;
  setMainFeedback: (feedback: Feedback) => void;
  onClose?: () => void;
  setRefetch: React.Dispatch<React.SetStateAction<boolean>>;
}

const CohortDeleteDialog: FC<CohortDeleteDialogProps> = ({
  cohort,
  open,
  cohortMgmtClient,
  setMainFeedback,
  onClose,
  setRefetch,
}) => {
  const { getText, i18nKeys } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = useCallback(() => {
    setFeedback({});
    typeof onClose === "function" && onClose();
  }, [onClose, setFeedback]);

  const handleDelete = useCallback(async () => {
    if (!cohort || !cohort.id) return;
    setIsLoading(true);
    try {
      await cohortMgmtClient.deleteCohort(cohort.id);
      setMainFeedback({
        type: "success",
        message: getText(i18nKeys.COHORT_DELETE_DIALOG__DELETE_SUCCESSFUL),
        autoClose: 6000,
      });
      setRefetch(true);
      handleClose();
    } catch (err) {
      console.error("An error occurred while deleting cohort");
      setFeedback({
        type: "error",
        message: getText(i18nKeys.COHORT_DELETE_DIALOG__ERROR_OCCURRED),
        description: getText(i18nKeys.COHORT_DELETE_DIALOG__ERROR_OCCURRED_DESCRIPTION),
      });
    } finally {
      setIsLoading(false);
    }
  }, [cohort, cohortMgmtClient, handleClose, setMainFeedback, setRefetch]);

  return (
    <Dialog
      className="delete-cohort-dialog"
      title={getText(i18nKeys.COHORT_DELETE_DIALOG__DELETE_COHORT)}
      closable
      open={open}
      onClose={handleClose}
      feedback={feedback}
    >
      <Divider />
      <div className="delete-cohort-dialog__content">
        <div>{getText(i18nKeys.COHORT_DELETE_DIALOG__ARE_YOU_SURE)}:</div>
        <div>
          {getText(i18nKeys.COHORT_DELETE_DIALOG__NAME)}: <strong>&quot;{cohort?.name}&quot;</strong>
          <br />
          {getText(i18nKeys.COHORT_DELETE_DIALOG__DESCRIPTION)}: <strong>&quot;{cohort?.description}&quot;</strong>
        </div>
      </div>

      {isLoading && <Loader />}
      <Divider />
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.COHORT_DELETE_DIALOG__CANCEL)}
          onClick={handleClose}
          variant="outlined"
          block
          disabled={isLoading}
        />
        <Button
          text={getText(i18nKeys.COHORT_DELETE_DIALOG__CONFIRM)}
          onClick={handleDelete}
          block
          disabled={isLoading}
        />
      </div>
    </Dialog>
  );
};

export default CohortDeleteDialog;
