import { FC, useCallback, useEffect, useRef, useState } from "react";
import { NodeProps, Position, useUpdateNodeInternals } from "reactflow";
import { Button, Dialog, DialogTitle, LinearProgress } from "@mui/material";
import { api } from "../../axios/api";
import { ScannedSchemaState, TableSourceHandleData, useApp, useScannedSchema, useTable } from "../../contexts";
import { ScanDataSourceTable } from "../../types/scanDataDialog";
import { saveBlobAs } from "../../utils/utils";
import { CloseDialogType } from "../ScanDataDialog/ScanDataDialog";
import "./ScanProgressDialog.scss";

interface ScanProgressDialogProps {
  open: boolean;
  onBack: () => void;
  onClose?: (type: CloseDialogType) => void;
  nodeId: string;
  scanId: string;
}

const FLOW_STATE_MAP = {
  Scheduled: 10,
  Pending: 25,
  Running: 50,
  Completed: 100,
};

export const ScanProgressDialog: FC<ScanProgressDialogProps> = ({ open, onBack, onClose, nodeId, scanId }) => {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [scanFailed, setScanFailed] = useState(false);
  const [log, setLog] = useState<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const updateNodeInternals = useUpdateNodeInternals();
  const { setPage } = useApp();
  const { setTableSourceHandles } = useTable();
  const { setScannedSchema } = useScannedSchema();

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      handleClear();
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleSaveReport = useCallback(async () => {
    try {
      const blob = await api.whiteRabbit.getScanReport(scanId);
      saveBlobAs(blob, "report.xlsx");
    } catch (error) {
      console.error("Failed to save report", error);
    }
  }, [scanId]);

  const handleLinkTables = useCallback(async () => {
    try {
      setLoading(true);

      const scannedResult: ScannedSchemaState = await api.backend.getSourceSchemaByFlowRunId(scanId);

      let sourceHandles: Partial<NodeProps<TableSourceHandleData>>[];
      sourceHandles = scannedResult.source_tables.map((table: ScanDataSourceTable, index: number) => ({
        id: `C.${index + 1}`,
        data: { label: table.table_name, type: "input" },
        sourcePosition: Position.Right,
      }));
      setTableSourceHandles(sourceHandles);

      setLoading(false);
      setScannedSchema(scannedResult);
      updateNodeInternals(nodeId);
      handleClose("success");
      setPage("table");
    } catch (error) {
      console.log(`Error creating source schema`);
    }
  }, [scanId, nodeId]);

  const fetchScanProgress = useCallback(async () => {
    try {
      const status = await api.whiteRabbit.getFlowRunStatus(scanId);

      if (status.state_name === "Completed") {
        setScanCompleted(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      } else if (status.state_name === "Failed" || status.state_name === "Crashed") {
        setScanCompleted(true);
        setScanFailed(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
      setLog(status.state_name);
      if (status.state_name in FLOW_STATE_MAP) {
        setProgress(FLOW_STATE_MAP[status.state_name as keyof typeof FLOW_STATE_MAP]);
      }
    } catch (e) {
      console.error("Failed to fetch scan progress", e);
    }
  }, [scanId]);

  const handleBack = useCallback(() => {
    onBack();
    handleClear();
  }, []);

  const handleClear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setLog("");
    setProgress(0);
    setScanCompleted(false);
  }, []);

  useEffect(() => {
    if (open && scanId !== "" && !scanCompleted) {
      // Initial fetch
      fetchScanProgress();

      intervalRef.current = setInterval(fetchScanProgress, 3000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [open, scanId, scanCompleted, fetchScanProgress]);

  return (
    <Dialog className="scan-progress-dialog" open={open} maxWidth="sm" fullWidth>
      <DialogTitle>Scan Data</DialogTitle>
      <div className="scan-progress-dialog__content">
        <div className="scan-progress-dialog__status">Scanning... Estimated time depends on selected database</div>
        <LinearProgress variant="determinate" value={progress} />
        <div className="scan-progress-dialog__log">{log}</div>
      </div>
      <div className="scan-progress-dialog__actions">
        <Button onClick={handleBack} variant="outlined" disabled={!scanCompleted || loading}>
          Back
        </Button>
        <Button onClick={handleSaveReport} variant="contained" color="primary" disabled={!scanCompleted || scanFailed}>
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
