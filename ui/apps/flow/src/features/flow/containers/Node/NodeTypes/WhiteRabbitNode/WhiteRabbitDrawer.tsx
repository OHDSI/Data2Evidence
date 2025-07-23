import React, { FC, useCallback, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import { Box, TextInput } from "@portal/components";
import { Button } from "@mui/material";
import { Editor } from "~/components/Editor/Editor";
import { useFormData } from "~/features/flow/hooks";
import {
  markStatusAsDraft,
  selectNodeById,
  setNode,
} from "~/features/flow/reducers";
import { NodeState } from "~/features/flow/types";
import { RootState, dispatch } from "~/store";
import { NodeDrawer, NodeDrawerProps } from "../../NodeDrawer/NodeDrawer";
import { NodeChoiceMap } from "../../NodeTypes";
import { WhiteRabbitNodeData } from "./WhiteRabbitNode";
import { MappingHandle } from "./MappingHandle";
import { ScanDataDialog } from "~/components/Dialog/ScanDataDialog/ScanDataDialog";
import { ScanProgressDialog } from "~/components/Dialog/ScanProgressDialog/ScanProgressDialog";
import "./WhiteRabbitDrawer.scss";

export type CloseDialogType = "success" | "cancelled";

export interface WhiteRabbitDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<WhiteRabbitNodeData>;
  onClose: () => void;
}

interface FormData extends WhiteRabbitNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  scannedSchema: {
    etl_mapping: {
      id: 0,
      scan_report_id: 0,
      scan_report_name: "",
      source_schema_name: "",
      cdm_version: "",
      username: "",
    },
    source_tables: [],
  },
  sourceHandles: [],
};

export const WhiteRabbitDrawer: FC<WhiteRabbitDrawerProps> = ({
  node,
  onClose,
  ...props
}) => {
  const [isScanDataDialogOpen, setIsScanDataDialogOpen] = useState(false);
  const [isScanProgressDialogOpen, setScanProgressDialogOpen] = useState(false);
  const [scanId, setScanId] = useState<string>("");

  const openScanDataDialog = () => {
    setIsScanDataDialogOpen(true);
  };

  const handleScanDataDialogClose = (type: CloseDialogType) => {
    setIsScanDataDialogOpen(false);
    if (type === "success") {
      setScanProgressDialogOpen(true);
    }
  };

  const handleBack = () => {
    setScanProgressDialogOpen(false);
    setIsScanDataDialogOpen(true);
  };

  const handleScanProgressDialogClose = () => {
    setScanProgressDialogOpen(false);
  };

  const nodeState = useSelector((state: RootState) =>
    selectNodeById(state, node.id)
  );

  const { formData, setFormData, onFormDataChange } =
    useFormData<FormData>(EMPTY_FORM_DATA);

  useEffect(() => {
    if (node.data) {
      setFormData({
        name: node.data.name,
        description: node.data.description,
        scannedSchema: node.data.scannedSchema,
        sourceHandles: node.data.sourceHandles,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["white_rabbit_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<WhiteRabbitNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated)); // here sets the node data
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData]);
  return (
    <>
      <NodeDrawer onOk={handleOk} onClose={onClose} {...props}>
        <div className="white-rabbit-drawer">
          {formData?.sourceHandles.length ? (
            <div className="handle-container scroll-shadow">
              {formData.sourceHandles.map((node) => (
                <MappingHandle {...node} key={node.id} />
              ))}
            </div>
          ) : (
            <div className="action-container">
              <div className="description">
                Please scan data to see Source tables
              </div>
              <div className="button-group">
                <Button
                  variant="contained"
                  fullWidth
                  onClick={openScanDataDialog}
                >
                  Scan Data
                </Button>
              </div>
            </div>
          )}
        </div>
      </NodeDrawer>
      <ScanDataDialog
        open={isScanDataDialogOpen}
        onClose={handleScanDataDialogClose}
        nodeId={node.id}
        setScanId={setScanId}
      />
      <ScanProgressDialog
        open={isScanProgressDialogOpen}
        onBack={handleBack}
        onClose={handleScanProgressDialogClose}
        nodeId={node.id}
        scanId={scanId}
        onFormDataChange={onFormDataChange}
      />
    </>
  );
};
