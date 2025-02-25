import { FC, useCallback, useEffect, useRef, useState } from "react";
import { NodeProps, Position, useUpdateNodeInternals } from "reactflow";
import { useNavigate } from "react-router-dom";
import { Button, Dialog, DialogTitle, LinearProgress } from "@mui/material";
import { api } from "../../axios/api";
import { TableSourceHandleData, useField, useScannedSchema, useTable } from "../../contexts";
import { ScanDataProgressLogs, ScanDataSourceTable } from "../../types/scanDataDialog";
import { buildFieldHandle, getColumns, saveBlobAs } from "../../utils/utils";
import { CloseDialogType } from "../ScanDataDialog/ScanDataDialog";
import "./ScanProgressDialog.scss";

interface ScanProgressDialogProps {
  open: boolean;
  onBack: () => void;
  onClose?: (type: CloseDialogType) => void;
  nodeId: string;
  scanId: number;
}

export const ScanProgressDialog: FC<ScanProgressDialogProps> = ({ open, onBack, onClose, nodeId, scanId }) => {
  const [progress, setProgress] = useState(0);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const updateNodeInternals = useUpdateNodeInternals();
  const { setTableSourceHandles } = useTable();
  const { setFieldSourceHandles } = useField();
  const { setScannedSchema } = useScannedSchema();
  const navigate = useNavigate();

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
      const response = await api.whiteRabbit.getScanResult(scanId);
      const dataId = response.dataId;
      const fileName = response.fileName;
      const scannedResult = await api.backend.createSourceSchemaByScanReport(dataId, fileName);

      let sourceHandles: Partial<NodeProps<TableSourceHandleData>>[];
      sourceHandles = scannedResult.source_tables.map((table: ScanDataSourceTable, index: number) => ({
        id: `C.${index + 1}`,
        data: { label: table.table_name, type: "input" },
        sourcePosition: Position.Right,
      }));
      setTableSourceHandles(sourceHandles);

      sourceHandles.forEach((table) => {
        const tableName = table.data?.label;
        if (!tableName) {
          console.warn("Invalid handle with empty table name");
          return;
        }

        const columns = getColumns(scannedResult.source_tables, tableName);
        const handles = buildFieldHandle(columns, tableName, true);
        setFieldSourceHandles({ tableName, data: handles });
      });

      setScannedSchema(scannedResult);
      updateNodeInternals(nodeId);
      handleClose("success");
      navigate("");
    } catch (error) {
      console.log(`Error creating source schema`);
    }
  }, [scanId, nodeId, navigate]);

  const fetchScanProgress = useCallback(async () => {
    try {
      const response = await api.whiteRabbit.getScanReportProgress(scanId);
      setLog(response.logs.map((log: ScanDataProgressLogs) => log.message));
      setProgress(response.logs[response.logs.length - 1].percent);
      if (response.statusName === "COMPLETED") {
        setScanCompleted(true);
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
    setLog([]);
    setProgress(0);
    setScanCompleted(false);
  }, []);

  useEffect(() => {
    if (open && scanId !== -1 && !scanCompleted) {
      intervalRef.current = setInterval(() => {
        fetchScanProgress();
        if (scanCompleted) {
          clearInterval(intervalRef.current!);
        }
      }, 1000);
      // Clear the interval when unmount
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [open, scanId, scanCompleted, fetchScanProgress]);

  return (
    <Dialog className="scan-progress-dialog" open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Scan Data</DialogTitle>
      <div className="scan-progress-dialog__content">
        <div className="scan-progress-dialog__status">Scanning... Estimated time depends on selected database</div>
        <LinearProgress variant="determinate" value={progress} />
        <div className="scan-progress-dialog__log">
          {log.map((entry, index) => (
            <div key={index}>{entry}</div>
          ))}
        </div>
      </div>
      <div className="scan-progress-dialog__actions">
        <Button onClick={handleBack} variant="outlined" disabled={!scanCompleted}>
          Back
        </Button>
        <Button onClick={handleSaveReport} variant="contained" color="primary" disabled={!scanCompleted}>
          Save report
        </Button>
        <Button onClick={handleLinkTables} variant="contained" color="primary" disabled={!scanCompleted}>
          Link tables
        </Button>
      </div>
    </Dialog>
  );
};
