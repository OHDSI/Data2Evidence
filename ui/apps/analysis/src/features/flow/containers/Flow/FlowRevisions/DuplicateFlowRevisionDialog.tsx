import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogProps,
  TextInput,
} from "@portal/components";
import { useSelector } from "react-redux";
import { RootState, dispatch } from "~/store";
import {
  useDuplicateDataflowMutation,
  useGetLatestDataflowByIdQuery,
} from "../../../slices";
import { useFormData } from "../../../hooks";
import { clearStatus, setDataflowId, setRevisionId } from "../../../reducers";
import { DuplicateDataflowDto } from "../../../types";
import "./DuplicateFlowRevisionDialog.scss";

export interface DuplicateFlowRevisionDialogProps extends DialogProps {}

interface FormData {
  name: string;
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
};

export const DuplicateFlowRevisionDialog: FC<
  DuplicateFlowRevisionDialogProps
> = ({ onClose, ...props }) => {
  const [duplicateDataflow, { isLoading }] = useDuplicateDataflowMutation();
  const dataflowId = useSelector((state: RootState) => state.flow.dataflowId);
  const revisionId = useSelector((state: RootState) => state.flow.revisionId);

  const { data: dataflow } = useGetLatestDataflowByIdQuery(dataflowId, {
    skip: !dataflowId,
  });
  const { formData, setFormData, onFormDataChange } =
    useFormData<FormData>(EMPTY_FORM_DATA);

  useEffect(() => {
    if (dataflow) {
      setFormData({ name: dataflow.name });
    } else {
      setFormData(EMPTY_FORM_DATA);
    }
  }, [dataflow]);

  const handleDuplicate = useCallback(async () => {
    const dataflow: DuplicateDataflowDto = {
      id: dataflowId,
      revisionId,
      name: formData.name,
    };
    const payload = await duplicateDataflow(dataflow);

    if ("data" in payload) {
      if (payload.data?.id) {
        dispatch(setDataflowId(payload.data.id));
      }
    }

    dispatch(setRevisionId(undefined));
    dispatch(clearStatus());
    typeof onClose === "function" && onClose();
  }, [dataflowId, revisionId, formData.name, onClose]);

  const handleClose = useCallback(() => {
    typeof onClose === "function" && onClose();
  }, [onClose]);

  return (
    <Dialog
      className="duplicate-flow-revision-dialog"
      title="Duplicate dataflow"
      onClose={handleClose}
      {...props}
    >
      <div className="duplicate-flow-revision-dialog__content">
        <Box mb={4}>
          <TextInput
            label="Name"
            value={formData.name}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({ name: e.target.value })
            }
          />
        </Box>
      </div>
      <div className="duplicate-flow-revision-dialog__footer">
        <Box
          display="flex"
          gap={1}
          className="duplicate-flow-revision-dialog__footer-actions"
        >
          <Button text="Cancel" variant="outlined" onClick={handleClose} />
          <Button
            text="Duplicate"
            onClick={handleDuplicate}
            loading={isLoading}
          />
        </Box>
      </div>
    </Dialog>
  );
};
