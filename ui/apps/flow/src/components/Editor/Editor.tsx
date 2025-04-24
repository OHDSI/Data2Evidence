import { Box, BoxProps, InputLabel } from "@portal/components";
import React, { FC } from "react";
import MonacoEditor, { MonacoEditorProps } from "react-monaco-editor";
import { DEFAULT_MONACO_OPTIONS } from "~/monaco";
import { FullScreenEditor } from "./FullScreenEditor";

export interface EditorProps extends MonacoEditorProps {
  label?: string;
  boxProps?: BoxProps;
  showFullScreenOption?: boolean;
}

export const Editor: FC<EditorProps> = ({
  label,
  boxProps,
  showFullScreenOption = true,
  ...props
}) => {
  return (
    <Box
      mb={4}
      display="flex"
      flexDirection="column"
      flex="1 1 0"
      {...boxProps}
    >
      <Box display="flex" alignItems="flex-end">
        <Box flex="1">
          <InputLabel shrink>{label}</InputLabel>
        </Box>
        {showFullScreenOption && (
          <FullScreenEditor label={label} boxProps={boxProps} {...props} />
        )}
      </Box>
      <Box sx={{ border: "1px solid #aaa", flex: "1 1 0", minHeight: "0" }}>
        <MonacoEditor options={DEFAULT_MONACO_OPTIONS} theme="vs" {...props} />
      </Box>
    </Box>
  );
};
