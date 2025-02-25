import { useState } from "react";
import { NodeProps } from "reactflow";
import { Button } from "@mui/material";
import { ScanDataDialog } from "../components/ScanDataDialog/ScanDataDialog";
import { ScanProgressDialog } from "../components/ScanProgressDialog/ScanProgressDialog";
import { useDialog, useTable } from "../contexts";
import { MappingHandle } from "./MappingHandle";
import { CloseDialogType } from "../components/ScanDataDialog/ScanDataDialog";
import "./BaseNode.scss";
import "./TableNode.scss";

export const TableSourceNode = (props: NodeProps) => {
  const { openLoadMappingDialog } = useDialog();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scanId, setScanId] = useState<number>(-1);
  const { sourceHandles } = useTable();

  const openScanDataDialog = () => {
    setIsDialogOpen(true);
  };

  const [isScanProgressDialogOpen, setScanProgressDialogOpen] = useState(false);

  const handleScanDataDialogClose = (type: CloseDialogType) => {
    setIsDialogOpen(false);
    if (type === "success") {
      setScanProgressDialogOpen(true);
    }
  };

  const handleBack = () => {
    setScanProgressDialogOpen(false);
    setIsDialogOpen(true);
  };

  const handleScanProgressDialogClose = () => {
    setScanProgressDialogOpen(false);
  };

  return (
    <div className="base-node table-node nodrag">
      <div className="content-container">
        {sourceHandles.length ? (
          <div className="handle-container scroll-shadow">
            {sourceHandles.map((node) => (
              <MappingHandle {...node} key={node.id} />
            ))}
          </div>
        ) : (
          <div className="action-container">
            <div className="description">Please scan data or open mapping to see Source tables</div>
            <div className="button-group">
              <Button variant="contained" fullWidth onClick={openScanDataDialog}>
                Scan Data
              </Button>
              <Button variant="contained" fullWidth onClick={() => openLoadMappingDialog(true)}>
                Open Mapping
              </Button>
            </div>
          </div>
        )}
      </div>
      <ScanDataDialog open={isDialogOpen} onClose={handleScanDataDialogClose} setScanId={setScanId} />
      <ScanProgressDialog
        open={isScanProgressDialogOpen}
        onBack={handleBack}
        onClose={handleScanProgressDialogClose}
        nodeId={props.id}
        scanId={scanId}
      />
    </div>
  );
};
