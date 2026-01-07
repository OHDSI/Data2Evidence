import React, { FC, useCallback, useState } from "react";
import Divider from "@mui/material/Divider";
import FormHelperText from "@mui/material/FormHelperText";
import { Button, Dialog, TextField } from "@portal/components";
import { api } from "../../../../axios/api";
import { NetworkStrategusStudy, Feedback, CloseDialogType } from "../../../../types";
import "./RunStrategusStudyDialog.scss";
import { useTranslation } from "../../../../contexts";

interface RunStrategusStudyDialogProps {
  study?: NetworkStrategusStudy;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const RunStrategusStudyDialog: FC<RunStrategusStudyDialogProps> = ({ study, open, onClose }) => {
  const { getText } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback>({});

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      typeof onClose === "function" && onClose(type);
    },
    [onClose, setFeedback]
  );

  return (
    <Dialog
      title={"Cleanup Strategus Study"}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      {" "}
    </Dialog>
  );
};

export default RunStrategusStudyDialog;
