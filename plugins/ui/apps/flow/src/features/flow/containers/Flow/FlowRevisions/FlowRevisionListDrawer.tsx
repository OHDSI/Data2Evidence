import React, { FC, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  Box,
  CloseIcon,
  Drawer,
  DrawerProps,
  IconButton,
} from "@portal/components";
import { RootState } from "~/store";
import { useGetDataflowByIdQuery } from "../../../slices/dataflow-slice";
import { FlowRevisionList } from "./FlowRevisionList";
import "./FlowRevisionListDrawer.scss";

export interface FlowRevisionListDrawerProps extends DrawerProps {
  onClose?: () => void;
}

export const FlowRevisionListDrawer: FC<FlowRevisionListDrawerProps> = ({
  onClose,
  ...drawerProps
}) => {
  const dataflowId = useSelector((state: RootState) => state.flow.dataflowId);
  const { data: dataflow } = useGetDataflowByIdQuery(dataflowId, {
    skip: !dataflowId,
  });

  const revisions = useMemo(() => {
    return dataflow?.revisions?.slice().sort((a, b) => {
      const aCreatedDate = new Date(a.createdDate).getTime();
      const bCreatedDate = new Date(b.createdDate).getTime();
      return bCreatedDate - aCreatedDate;
    });
  }, [dataflow]);

  const handleClose = useCallback(() => {
    typeof onClose === "function" && onClose();
  }, [onClose]);

  return (
    <Drawer
      anchor="left"
      className="flow-revision-list-drawer"
      PaperProps={{ style: { width: "500px" } }}
      onClose={onClose}
      {...drawerProps}
    >
      <div className="flow-revision-list-drawer__header">
        <Box flexGrow={1}>Version history of "{dataflow?.name}"</Box>
        <Box>
          <IconButton
            startIcon={<CloseIcon />}
            aria-label="close"
            onClick={handleClose}
          />
        </Box>
      </div>
      <div className="flow-revision-list-drawer__content">
        <FlowRevisionList revisions={revisions} onAfterView={handleClose} />
      </div>
    </Drawer>
  );
};
