import { FC, useCallback, useEffect, useState } from "react";
import Divider from "@mui/material/Divider";
import { Box, Button, Dialog, FormControl, IconButton, TextField, TrashIcon } from "@portal/components";
import { useField } from "../../contexts";
import "./ConstantValueDialog.scss";

type CloseDialogType = "success" | "cancelled";

interface ConstantValueDialogProps {
  handleId?: string;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

export const ConstantValueDialog: FC<ConstantValueDialogProps> = ({ handleId, open, onClose }) => {
  const [value, setValue] = useState<string | number>("");
  const { activeTargetHandles, setActiveFieldTargetHandles } = useField();
  const handle = activeTargetHandles.find((h) => h.id === handleId);
  const constantValue = handle?.data.constantValue;

  useEffect(() => {
    setValue(constantValue || "");
  }, [constantValue]);

  const handleApply = useCallback(() => {
    setActiveFieldTargetHandles(
      activeTargetHandles.map((h) => (h.id === handleId ? { ...h, data: { ...h.data, constantValue: value } } : h))
    );
    typeof onClose === "function" && onClose("success");
  }, [activeTargetHandles, value]);

  const handleRemove = useCallback(() => {
    setActiveFieldTargetHandles(
      activeTargetHandles.map((h) => (h.id === handleId ? { ...h, data: { ...h.data, constantValue: undefined } } : h))
    );
    typeof onClose === "function" && onClose("success");
  }, [activeTargetHandles]);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  return (
    <Dialog
      className="constant-value-dialog"
      title="Constant value"
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
              placeholder="Input value"
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
