import React, { FC, useCallback, useState } from "react";
import { Button, Dialog } from "@portal/components";
import { Feedback, UsefulEvent, CloseDialogType, Flow } from "../../../../types";
import Divider from "@mui/material/Divider";
import FormHelperText from "@mui/material/FormHelperText";
import webComponentWrapper from "../../../../webcomponents/webComponentWrapper";
import { api } from "../../../../axios/api";
import "./DeleteFlowDialog.scss";
import { useTranslation } from "../../../../contexts";

interface DeleteFlowDialogProps {
  flow?: Flow;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const DeleteFlowDialog: FC<DeleteFlowDialogProps> = ({ flow, open, onClose }) => {
  const { getText, i18nKeys } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback>({});
  const [inputData, setInputData] = useState("");
  const [inputError, setInputError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      setInputData("");
      typeof onClose === "function" && onClose(type);
    },
    [onClose, setFeedback]
  );

  const isInputError = useCallback(() => {
    if (inputData !== flow?.name) {
      setInputError(true);
      return true;
    } else {
      setInputError(false);
      return false;
    }
  }, [inputData, flow]);

  const deleteFlow = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        await api.dataflow.deleteFlow(id);
      } catch (error: any) {
        console.log(error);
        setFeedback({
          type: "error",
          message: getText(i18nKeys.DELETE_FLOW_DIALOG__ERROR, [String(flow?.name)]),
          description: error.data.message,
        });
      } finally {
        setLoading(false);
      }
    },
    [flow, getText]
  );

  const handleDelete = useCallback(async () => {
    if (flow == null) return;
    if (isInputError()) return;
    await deleteFlow(flow.id);
    handleClose("success");
  }, [flow, isInputError, deleteFlow, handleClose]);

  return (
    <Dialog
      className="delete-flow-dialog"
      title={getText(i18nKeys.DELETE_FLOW_DIALOG__DELETE)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      <Divider />
      <div className="delete-flow-dialog__content">
        <div className="delete-flow-dialog__content-text">
          <div>
            {getText(i18nKeys.DELETE_FLOW_DIALOG__CONFIRM_1)} <br />
            {getText(i18nKeys.DELETE_FLOW_DIALOG__CONFIRM_2)}: <strong>&quot;{flow!.name}&quot;</strong>? <br />
          </div>
          <div>{getText(i18nKeys.DELETE_FLOW_DIALOG__CONFIRM_3)}</div>
          <div>{getText(i18nKeys.DELETE_FLOW_DIALOG__CONFIRM_4)}</div>
        </div>
        <div className="delete-flow-dialog__content-input">
          <d4l-input
            // @ts-ignore
            ref={webComponentWrapper({
              handleInput: (event: UsefulEvent) => {
                setInputData(event.target.value);
              },
            })}
            label={getText(i18nKeys.DELETE_FLOW_DIALOG__ENTER_FLOW_NAME)}
            error={inputError}
            value={inputData}
          />
          {inputError && <FormHelperText>{getText(i18nKeys.DELETE_FLOW_DIALOG__ENTER_EXACT_FLOW_NAME)}</FormHelperText>}
        </div>
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.DELETE_FLOW_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
          disabled={loading}
        />
        <Button
          text={getText(i18nKeys.DELETE_FLOW_DIALOG__CONFIRM_DELETION)}
          onClick={handleDelete}
          block
          loading={loading}
        />
      </div>
    </Dialog>
  );
};

export default DeleteFlowDialog;
