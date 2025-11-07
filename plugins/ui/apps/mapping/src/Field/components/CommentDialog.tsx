import { FC, useCallback, useEffect, useState } from "react";
import Divider from "@mui/material/Divider";
import { Box, Button, Dialog, FormControl, IconButton, TextField, TrashIcon } from "@portal/components";
import { useActiveFieldMap } from "../../contexts";
import "./CommentDialog.scss";

type CloseDialogType = "success" | "cancelled";

interface CommentDialogProps {
  handleId?: string;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

export const CommentDialog: FC<CommentDialogProps> = ({ handleId, open, onClose }) => {
  const [value, setValue] = useState<string>("");
  const { targetHandles, setFieldTargetHandles } = useActiveFieldMap();
  const handle = targetHandles.find((h) => h.id === handleId);
  const comment = handle?.data.comment;

  useEffect(() => {
    setValue(comment || "");
  }, [comment]);

  const handleApply = useCallback(() => {
    setFieldTargetHandles(
      targetHandles.map((h) => (h.id === handleId ? { ...h, data: { ...h.data, comment: value } } : h))
    );
    typeof onClose === "function" && onClose("success");
  }, [targetHandles, value]);

  const handleRemove = useCallback(() => {
    setFieldTargetHandles(
      targetHandles.map((h) => (h.id === handleId ? { ...h, data: { ...h.data, comment: undefined } } : h))
    );
    typeof onClose === "function" && onClose("success");
  }, [targetHandles]);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  return (
    <Dialog
      className="constant-value-dialog"
      title="Comment"
      open={open}
      onClose={() => handleClose("cancelled")}
      fullWidth
      maxWidth="xs"
    >
      <Divider />
      <div className="constant-value-dialog__content">
        <FormControl fullWidth variant="standard">
          <Box component="div" sx={{ display: "flex" }}>
            <TextField
              fullWidth
              placeholder="Enter comment"
              size="small"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <IconButton startIcon={<TrashIcon />} onClick={handleRemove} />
          </Box>
        </FormControl>
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button block text="Cancel" variant="outlined" onClick={() => handleClose("cancelled")} />
        <Button block text="Apply" variant="contained" onClick={handleApply} />
      </div>
    </Dialog>
  );
};
