import React, { FC, useCallback } from "react";
import {
  Box,
  CloseIcon,
  DialogProps,
  Drawer,
  IconButton,
} from "@portal/components";
import dayjs from "dayjs";
import { Editor } from "~/components/Editor/Editor";
import "./ResultsDrawer.scss";

export interface ResultsDrawerProps extends DialogProps {
  title: string;
  error: boolean;
  message: string;
  createdDate?: string;
}

export const ResultsDrawer: FC<ResultsDrawerProps> = ({
  onClose,
  title,
  error,
  message,
  createdDate,
  ...props
}) => {
  const handleClose = useCallback(() => {
    typeof onClose === "function" && onClose();
  }, [onClose]);

  const type = error ? "Error" : "Output";
  return (
    <Drawer
      onClose={handleClose}
      anchor="right"
      PaperProps={{ style: { width: "800px" } }}
      className="results-drawer"
      {...props}
    >
      <div className="results-drawer__header">
        <Box flexGrow={1}>
          [{type}] {title}{" "}
          {createdDate && (
            <Box fontSize="12px">
              {type} as of {dayjs(createdDate).format("DD MMM YYYY h:mm:ss a")}
            </Box>
          )}
        </Box>
        <Box>
          <IconButton
            startIcon={<CloseIcon />}
            aria-label="close"
            onClick={handleClose}
          />
        </Box>
      </div>
      <div className="results-drawer__content">
        <Editor
          value={message}
          label=""
          options={{
            minimap: { enabled: false },
            readOnly: true,
          }}
          boxProps={{ mb: 0 }}
        />
      </div>
    </Drawer>
  );
};
