import React, { FC, useCallback, useState } from "react";
import { Feedback } from "../types";
import Divider from "@mui/material/Divider";
import { Button, Dialog } from "@portal/components";
import { api } from "../axios/api";
import "./ConceptSetDeleteDialog.scss";
import { useTranslation } from "../hooks";

interface ConceptSetDeleteDialogProps {
  conceptSet?: { id: number; name: string };
  open: boolean;
  datasetId: string;
  setMainFeedback: (feedback: Feedback) => void;
  onClose?: () => void;
  onDeleted: () => void;
}

const ConceptSetDeleteDialog: FC<ConceptSetDeleteDialogProps> = ({
  conceptSet,
  open,
  datasetId,
  setMainFeedback,
  onClose,
  onDeleted,
}) => {
  const { getText, i18nKeys } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = useCallback(() => {
    setFeedback({});
    typeof onClose === "function" && onClose();
  }, [onClose, setFeedback]);

  const handleDelete = useCallback(async () => {
    if (!conceptSet || !conceptSet.id) return;
    setIsLoading(true);
    try {
      await api.d2eWebapi.deleteConceptSet(conceptSet.id, datasetId);
      setMainFeedback({
        type: "success",
        message: getText(i18nKeys.CONCEPT_SET_DELETE_DIALOG__DELETE_SUCCESSFUL),
        autoClose: 6000,
      });
      onDeleted();
      handleClose();
    } catch (err: any) {
      console.error("An error occurred while deleting concept set", err);

      // Parse error response for specific status codes
      const status = err?.response?.status;
      let errorMessage = getText(
        i18nKeys.CONCEPT_SET_DELETE_DIALOG__ERROR_OCCURRED
      );
      let errorDescription = getText(
        i18nKeys.CONCEPT_SET_DELETE_DIALOG__ERROR_OCCURRED_DESCRIPTION
      );

      if (status === 403) {
        errorMessage = getText(
          i18nKeys.CONCEPT_SET_DELETE_DIALOG__ERROR_FORBIDDEN
        );
        errorDescription = "";
      } else if (status === 404) {
        errorMessage = getText(
          i18nKeys.CONCEPT_SET_DELETE_DIALOG__ERROR_NOT_FOUND
        );
        errorDescription = "";
      } else if (status >= 500) {
        errorMessage = getText(
          i18nKeys.CONCEPT_SET_DELETE_DIALOG__ERROR_SERVER
        );
        errorDescription = getText(
          i18nKeys.CONCEPT_SET_DELETE_DIALOG__ERROR_OCCURRED_DESCRIPTION
        );
      }

      setFeedback({
        type: "error",
        message: errorMessage,
        description: errorDescription,
      });
    } finally {
      setIsLoading(false);
    }
  }, [conceptSet, datasetId, handleClose, setMainFeedback, onDeleted, getText]);

  return (
    <Dialog
      className="delete-concept-set-dialog"
      title={getText(i18nKeys.CONCEPT_SET_DELETE_DIALOG__DELETE_CONCEPT_SET)}
      closable
      open={open}
      onClose={handleClose}
      feedback={feedback}
    >
      <Divider />
      <div className="delete-concept-set-dialog__content">
        <div>{getText(i18nKeys.CONCEPT_SET_DELETE_DIALOG__ARE_YOU_SURE)}:</div>
        <div>{conceptSet?.name} ?</div>
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.CONCEPT_SET_DELETE_DIALOG__CANCEL)}
          onClick={handleClose}
          variant="outlined"
          block
          disabled={isLoading}
        />
        <Button
          text={getText(i18nKeys.CONCEPT_SET_DELETE_DIALOG__CONFIRM)}
          onClick={handleDelete}
          block
          loading={isLoading}
        />
      </div>
    </Dialog>
  );
};

export default ConceptSetDeleteDialog;
