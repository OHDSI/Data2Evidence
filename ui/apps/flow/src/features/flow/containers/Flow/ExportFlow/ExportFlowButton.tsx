import React, { FC, useCallback } from "react";
import { IconButton, Tooltip } from "@portal/components";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { RootState } from "~/store";
import { DataflowExportDto } from "~/features/flow/types";
import { useSelector } from "react-redux";
import { useGetDataflowByIdQuery } from "~/features/flow/slices";

export interface ExportFlowButtonProps {}

export const ExportFlowButton: FC<ExportFlowButtonProps> = () => {
  const dataflowId = useSelector((state: RootState) => state.flow.dataflowId);
  const revisionId = useSelector((state: RootState) => state.flow.revisionId);

  const isLatest = revisionId == null;
  const { data: dataflow } = useGetDataflowByIdQuery(dataflowId, {
    skip: !dataflowId,
  });

  const downloadJSONFile = (jsonData: string, filename: string) => {
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleExport = useCallback(async () => {
    if (!dataflow) return;
    const { revisions } = dataflow;
    let { flow, createdDate, createdBy } = isLatest
      ? revisions[revisions.length - 1]
      : revisions.find((revision) => revision.id === revisionId) || {
          flow: { nodes: [], edges: [] },
        };

    const exportDataflow: DataflowExportDto = {
      id: dataflowId,
      name: dataflow.name,
      flow,
      createdBy,
      createdDate,
    };

    const jsonData = JSON.stringify(exportDataflow);
    downloadJSONFile(jsonData, dataflow.name);
  }, [dataflowId, revisionId, dataflow]);

  return (
    <Tooltip title="Export flow">
      <div>
        <IconButton
          startIcon={
            <FileDownloadOutlinedIcon sx={{ width: 28, height: 30 }} />
          }
          onClick={handleExport}
        />
      </div>
    </Tooltip>
  );
};
