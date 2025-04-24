import React, { FC, useCallback, useState } from "react";
import { Box, Button, Dialog, InputLabel } from "@portal/components";
import { Editor, EditorProps } from "./Editor";

interface FullScreenEditorProps extends EditorProps {}

export const FullScreenEditor: FC<FullScreenEditorProps> = (editorProps) => {
  const [open, setOpen] = useState(false);

  const handleClickOpen = useCallback(() => {
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <>
      <InputLabel
        onClick={handleClickOpen}
        style={{ fontSize: 14, cursor: "pointer", marginBottom: 2 }}
      >
        Full screen
      </InputLabel>
      <Dialog
        fullScreen
        open={open}
        onClose={handleClose}
        style={{ padding: 0 }}
        PaperProps={{
          style: {
            borderRadius: 0,
          },
        }}
      >
        <Box p={2} display="flex" flexDirection="column" flex="1">
          <Editor {...editorProps} showFullScreenOption={false} />
          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button text="Close" onClick={handleClose} />
          </Box>
        </Box>
      </Dialog>
    </>
  );
};
