import { Box, BoxProps, InputLabel } from "@portal/components";
import React, { FC } from "react";
import MonacoEditor, { MonacoEditorProps } from "react-monaco-editor";
import { DEFAULT_MONACO_OPTIONS } from "~/monaco";

interface EditorProps extends MonacoEditorProps {
  label?: string;
  boxProps?: BoxProps;
}

export const Editor: FC<EditorProps> = ({ label, boxProps, ...props }) => {
  return (
    <Box
      mb={4}
      display="flex"
      flexDirection="column"
      flex="1 1 0"
      {...boxProps}
    >
      <InputLabel shrink>{label}</InputLabel>
      <Box sx={{ border: "1px solid #aaa", flex: "1 1 0", minHeight: "0" }}>
        <MonacoEditor options={DEFAULT_MONACO_OPTIONS} theme="vs" {...props} />
      </Box>
    </Box>
  );
};
