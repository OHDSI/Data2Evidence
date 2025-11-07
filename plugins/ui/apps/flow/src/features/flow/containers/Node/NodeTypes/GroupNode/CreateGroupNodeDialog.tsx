import React, { ChangeEvent, FC, useCallback, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Dialog,
  DialogProps,
} from "@portal/components";
import { useFormData } from "../../../../hooks";
import { setAddGroupDialog } from "~/features/flow/reducers";
import { dispatch } from "~/store";
import { Feedback } from "../../../../../../../../portal/src/types";
import { Node } from "reactflow";
import { ExecutorOptions } from "../../../../types";
import "./CreateGroupNodeDialog.scss";

export interface CreateGroupNodeDialogProps
  extends Omit<DialogProps, "onClose"> {
  onClose: (name: string, payload: ExecutorOptions) => void;
  open: boolean;
  nodes: Node[];
}

interface FormData {
  name: string;
  payload: string;
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  payload: `{"executor_type": "default","executor_address": {"host": "","port": "","ssl": false}}`,
};

export const CreateGroupNodeDialogDialog: FC<CreateGroupNodeDialogProps> = ({
  onClose,
  nodes,
  ...props
}) => {
  const [feedback, setFeedback] = useState<Feedback>({});
  const { formData, setFormData, onFormDataChange } =
    useFormData<FormData>(EMPTY_FORM_DATA);

  const GROUP_NODE = "subflow";

  const handleCreate = useCallback(
    (formData) => {
      const uniqueGroupName = new Set<string>();
      nodes.forEach((node) => {
        if (node.type === GROUP_NODE) {
          uniqueGroupName.add(node.data.name);
        }
      });
      if (uniqueGroupName && uniqueGroupName.has(formData.name)) {
        setFeedback({
          type: "error",
          message: "Duplicate subflow name exsits, please use another name",
        });
        return;
      }
      try {
        JSON.parse(formData.payload);
      } catch (error) {
        setFeedback({
          type: "error",
          message: "Please enter a valid JSON value for executor options.",
        });
        return;
      }
      typeof onClose === "function" &&
        onClose(formData.name, JSON.parse(formData.payload));
      setFeedback({});
      setFormData(EMPTY_FORM_DATA);
    },
    [onClose, formData, nodes]
  );

  const handleCancel = useCallback(() => {
    setFeedback({});
    setFormData(EMPTY_FORM_DATA);
    dispatch(setAddGroupDialog({ visible: false }));
  }, []);

  return (
    <Dialog
      className="create-group-node-dialog"
      title="Create subflow"
      onClose={handleCancel}
      feedback={feedback}
      {...props}
    >
      <div className="create-group-node-dialog__content">
        <Box mb={4}>
          <TextField
            label="Name"
            sx={{ width: "100%" }}
            variant="standard"
            value={formData.name}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({ name: e.target.value })
            }
          />
        </Box>
        <Box mb={4}>
          <TextField
            label="Executor Options"
            sx={{ width: "100%" }}
            variant="standard"
            value={formData.payload}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({ payload: e.target.value })
            }
          />
        </Box>
      </div>
      <div className="create-group-node-dialog__footer">
        <Box
          display="flex"
          gap={1}
          className="create-group-node-dialog__footer-actions"
        >
          <Button text="Cancel" variant="outlined" onClick={handleCancel} />
          <Button
            text="Create"
            onClick={() => handleCreate(formData)}
            disabled={!formData.name}
          />
        </Box>
      </div>
    </Dialog>
  );
};
