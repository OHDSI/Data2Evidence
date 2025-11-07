import React, { FC, useCallback, useState } from "react";
import Divider from "@mui/material/Divider";
import { Button, Dialog } from "@portal/components";
import { Study, Feedback, CloseDialogType, UpdateSchemaInput } from "../../../../types";
import { Gateway } from "../../../../axios/gateway";
import "./UpdateSchemaDialog.scss";
import { useTranslation } from "../../../../contexts";

interface UpdateSchemaDialogProps {
  study?: Study;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const UpdateSchemaDialog: FC<UpdateSchemaDialogProps> = ({ study, open, onClose }) => {
  const { getText, i18nKeys } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback>({});
  const [updating, setUpdating] = useState(false);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      typeof onClose === "function" && onClose(type);
    },
    [onClose, setFeedback]
  );

  const handleUpdate = useCallback(async () => {
    if (study == null) return;

    const input: UpdateSchemaInput = {
      schemaName: study.schemaName,
      dataModel: study.dataModel,
      databaseCode: study.databaseCode,
      dialect: study.dialect ? study.dialect : "",
      vocabSchemaValue: study.vocabSchemaName ? study.vocabSchemaName : "",
      plugin: study.plugin,
    };

    try {
      setUpdating(true);
      const gatewayAPI = new Gateway();
      await gatewayAPI.updateSchema(input);
      handleClose("success");
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: getText(i18nKeys.UPDATE_SCHEMA_DIALOG__ERROR, [study.id]),
        description: err.data?.message || err.data,
      });
      console.error("Error when updating schema", err);
    } finally {
      setUpdating(false);
    }
  }, [study, setFeedback, handleClose, getText]);

  return (
    <Dialog
      className="update-schema-dialog"
      title={getText(i18nKeys.UPDATE_SCHEMA_DIALOG__UPDATE_SCHEMA)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      <Divider />
      <div className="update-schema-dialog__content">
        <div>{getText(i18nKeys.UPDATE_SCHEMA_DIALOG__CONFIRM)}</div>
        <div>{study!.id} ?</div>
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.UPDATE_SCHEMA_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
          disabled={updating}
        />
        <Button text={getText(i18nKeys.UPDATE_SCHEMA_DIALOG__UPDATE)} onClick={handleUpdate} block loading={updating} />
      </div>
    </Dialog>
  );
};

export default UpdateSchemaDialog;
