import React, { FC, useCallback, useEffect, useState } from "react";
import { IconButton, Tooltip } from "@portal/components";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { dispatch, RootState } from "~/store";
import { DataflowExportDto } from "~/features/flow/types";
import { useSelector } from "react-redux";
import { useGetDataflowByIdQuery } from "~/features/flow/slices";
import { setSaveFlowDialog } from "~/features/flow/reducers";

export interface ExportFlowButtonProps {}

const downloadJSONFile = (jsonData: string, filename: string) => {
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
};

export const ExportFlowButton: FC<ExportFlowButtonProps> = () => {
  const dataflowId = useSelector((state: RootState) => state.flow.dataflowId);
  const revisionId = useSelector((state: RootState) => state.flow.revisionId);

  const status = useSelector((state: RootState) => state.flow.status);
  const [runAfterSaved, setRunAfterSaved] = useState(false);

  const isLatest = revisionId == null;
  const {
    data: dataflow,
    refetch,
    isFetching,
  } = useGetDataflowByIdQuery(dataflowId, {
    skip: !dataflowId,
  });

  const runExport = useCallback(async () => {
    if (!dataflow) return;

    const { revisions } = dataflow;
    let { flow, createdDate, createdBy } = isLatest
      ? revisions[0]
      : revisions.find((revision) => revision.id === revisionId) || {
          flow: { nodes: [], edges: [], variables: [] },
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
  }, [dataflowId, revisionId, dataflow, isLatest]);

  useEffect(() => {
    if (runAfterSaved && status === "saved" && !isFetching) {
      setRunAfterSaved(false);
      runExport();
    }
  }, [runAfterSaved, status, isFetching, runExport]);

  const handleExport = useCallback(async () => {
    if (status === "draft") {
      dispatch(setSaveFlowDialog({ visible: true, dataflowId }));
      await refetch();
      setRunAfterSaved(true);
    } else {
      await runExport();
    }
  }, [dataflowId, runExport, status, refetch]);

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
