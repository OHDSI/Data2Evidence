import React, { FC } from "react";
import { IconButton, Tooltip } from "@portal/components";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { DeleteFlowDialog } from "./DeleteFlowDialog";
import { useBooleanHelper } from "~/features/flow/hooks";

export const DeleteFlowButton: FC = () => {
  const [dlgVisible, openDlg, closeDlg] = useBooleanHelper(false);

  return (
    <>
      <Tooltip title="Delete flow">
        <div>
          <IconButton
            startIcon={<DeleteOutlineIcon sx={{ width: 28, height: 30 }} />}
            onClick={openDlg}
          />
        </div>
      </Tooltip>
      <DeleteFlowDialog open={dlgVisible} onClose={closeDlg} />
    </>
  );
};
