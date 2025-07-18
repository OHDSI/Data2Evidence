import React, { FC, useCallback, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import { Box, TextInput } from "@portal/components";
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

  const handleOk = useCallback(() => {
    const updated: NodeState<WhiteRabbitNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData]);

  return (
    <NodeDrawer onOk={handleOk} onClose={onClose} {...props}>
      hello
    </NodeDrawer>
  );
};
