import React, { ChangeEvent, FC, useCallback, useRef } from "react";
import { IconButton, Tooltip } from "@portal/components";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import { dispatch } from "~/store";
import { DataflowExportDto } from "~/features/flow/types";
import {
  markStatusAsDraft,
  replaceEdges,
  replaceNodes,
} from "~/features/flow/reducers";

export interface ImportFlowButtonProps {}

export const ImportFlowButton: FC<ImportFlowButtonProps> = () => {
  const hiddenFileInput = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(async () => {
    hiddenFileInput.current && hiddenFileInput.current.click();
  }, [hiddenFileInput]);

  const handleFileOpen = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).map((file: any) => file);
    if (files.length >= 1) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const jsonData = reader.result as string;

        try {
          const json = JSON.parse(jsonData) as DataflowExportDto;
          console.debug("JSON content:", json);

          dispatch(replaceNodes(json.flow.nodes));
          dispatch(replaceEdges(json.flow.edges));
          dispatch(markStatusAsDraft());
        } catch (err) {
          console.error("Error parsing JSON:", err);
        }
      };
      reader.readAsText(file);
    }
  }, []);

  return (
    <Tooltip title="Import flow">
      <div>
        <IconButton
          startIcon={<UploadFileOutlinedIcon sx={{ width: 28, height: 30 }} />}
          onClick={handleImport}
        />
        <input
          ref={hiddenFileInput}
          type="file"
          accept=".json"
          onChange={handleFileOpen}
          onClick={(event) => {
            (event.target as any).value = null;
          }}
          style={{ display: "none" }}
          id="open-flow-json"
        />
      </div>
    </Tooltip>
  );
};
