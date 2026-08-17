import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import { NodeProps, Position, useUpdateNodeInternals } from "reactflow";
import { Button, Dialog, DialogTitle, LinearProgress } from "@mui/material";
import {
  TableSourceHandleData,
  ScannedSchemaState,
} from "~/features/flow/types";
import { ScanMetadata } from "../ScanDataDialog/ScanDataDialog";
import { ScanDataSourceTable } from "~/features/flow/types";
import {
  useLazyGetFlowRunStatusQuery,
  useLazyGetSourceSchemaByFlowRunIdQuery,
  useLazyGetScanReportQuery,
} from "~/features/flow/slices";
import {
  classifyFlowState,
  MAX_CONSECUTIVE_POLL_ERRORS,
} from "~/features/flow/utils/scan-progress-state";

export type CloseDialogType = "success" | "cancelled";
import "./ScanProgressDialog.scss";

interface ScanProgressDialogProps {
  open: boolean;
  onBack: () => void;
  onClose?: (type: CloseDialogType) => void;
  nodeId: string;
  scanId: string;
  scanMetadata: ScanMetadata;
  onFormDataChange: (updates: { [field: string]: any }) => void;
}

export const ScanProgressDialog: FC<ScanProgressDialogProps> = ({
  open,
  onBack,
  onClose,
  nodeId,
  scanId,
  scanMetadata,
  onFormDataChange,
}) => {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [scanFailed, setScanFailed] = useState(false);
  const [log, setLog] = useState<string>("");
  const [pollError, setPollError] = useState<string>("");
  const pollErrorCountRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const updateNodeInternals = useUpdateNodeInternals();
  // setTableSourceHandles
  // setScannedSchema
  const [getFlowRunStatus] = useLazyGetFlowRunStatusQuery();
  const [getSourceSchemaByFlowRunId] = useLazyGetSourceSchemaByFlowRunIdQuery();
  const [getScanReport] = useLazyGetScanReportQuery();

  const handleClear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setLog("");
    setProgress(0);
    setScanCompleted(false);
    setScanFailed(false);
    setPollError("");
    pollErrorCountRef.current = 0;
  }, []);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      handleClear();
      typeof onClose === "function" && onClose(type);
    },
    [onClose],
  );

  const handleSaveReport = useCallback(async () => {
    try {
      await getScanReport(scanId).unwrap();
    } catch (error) {
      console.error("Failed to save report", error);
    }
  }, [scanId]);

  const handleLinkTables = useCallback(async () => {
    try {
      setLoading(true);

      const scannedResult: ScannedSchemaState =
        await getSourceSchemaByFlowRunId(scanId).unwrap();

      let sourceHandles: Partial<NodeProps<TableSourceHandleData>>[];
      sourceHandles = scannedResult.source_tables.map(
        (table: ScanDataSourceTable, index: number) => ({
          id: `C.${index + 1}`,
          data: { label: table.table_name, type: "input" },
          sourcePosition: Position.Right,
        }),
      );
      onFormDataChange({ sourceHandles: sourceHandles });
      setLoading(false);
      onFormDataChange({ scannedSchema: scannedResult });
      onFormDataChange({ scanMetadata });
      updateNodeInternals(nodeId);
      handleClose("success");
    } catch (error) {
      console.log(`Error creating source schema: ${error}`);
    }
  }, [scanId, nodeId, scanMetadata]);

  const fetchScanProgress = useCallback(async () => {
    try {
      const status = await getFlowRunStatus(scanId).unwrap();

      pollErrorCountRef.current = 0;
      setPollError("");

      const {
        terminal,
        failed,
        progress: statePercent,
      } = classifyFlowState(status.state_name);

      if (terminal) {
        setScanCompleted(true);
        setScanFailed(failed);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }

      setLog(status.state_name);
      if (statePercent !== undefined) {
        setProgress(statePercent);
      }
    } catch (e) {
      pollErrorCountRef.current += 1;
      console.error("Failed to fetch scan progress", e);

      if (pollErrorCountRef.current >= MAX_CONSECUTIVE_POLL_ERRORS) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setPollError(
          "Lost contact with the scan job. It may still be running — " +
            "close this dialog and check the flow run status.",
        );
      }
    }
  }, [scanId]);

  const handleBack = useCallback(() => {
    onBack();
    handleClear();
  }, []);

  useEffect(() => {
    if (open && scanId !== "" && !scanCompleted && !pollError) {
      // Initial fetch
      fetchScanProgress();

      intervalRef.current = setInterval(fetchScanProgress, 3000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [open, scanId, scanCompleted, pollError, fetchScanProgress]);

  return (
    <Dialog
      className="scan-progress-dialog"
      open={open}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Scan Data</DialogTitle>
      <div className="scan-progress-dialog__content">
        <div className="scan-progress-dialog__status">
          Scanning... Estimated time depends on selected database
        </div>
        <LinearProgress variant="determinate" value={progress} />
        <div className="scan-progress-dialog__log">{pollError || log}</div>
      </div>
      <div className="scan-progress-dialog__actions">
        <Button
          onClick={handleBack}
          variant="outlined"
          disabled={loading}
        >
          Back
        </Button>
        <Button
          onClick={handleSaveReport}
          variant="contained"
          color="primary"
          disabled={!scanCompleted || scanFailed}
        >
          Save report
        </Button>
        <Button
          onClick={handleLinkTables}
          variant="contained"
          color="primary"
          disabled={!scanCompleted || loading || scanFailed}
        >
          Link tables
        </Button>
      </div>
    </Dialog>
  );
};
