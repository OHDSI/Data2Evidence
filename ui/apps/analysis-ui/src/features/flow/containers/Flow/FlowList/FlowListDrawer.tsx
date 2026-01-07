import React, { FC, useCallback } from "react";
import { useGetDataflowsQuery } from "../../../slices/dataflow-slice";
import { DataflowDto } from "../../../types";
import {
  Box,
  CloseIcon,
  Drawer,
  DrawerProps,
  IconButton,
  List,
  ListItem,
  ListItemButton,
} from "@portal/components";
import { dispatch } from "~/store";
import { setDataflowId } from "../../../reducers";
import "./FlowListDrawer.scss";

export interface FlowListDrawerProps extends DrawerProps {
  onClose?: () => void;
}

export const FlowListDrawer: FC<FlowListDrawerProps> = ({
  onClose,
  ...drawerProps
}) => {
  const { data: dataflows } = useGetDataflowsQuery();

  const handleGetFlow = useCallback(async (df: DataflowDto) => {
    dispatch(setDataflowId(df.id));
    typeof onClose === "function" && onClose();
  }, []);

  const handleClose = useCallback(() => {
    typeof onClose === "function" && onClose();
  }, [onClose]);

  return (
    <Drawer
      anchor="left"
      className="flow-list-drawer"
      PaperProps={{ style: { width: "500px" } }}
      onClose={onClose}
      {...drawerProps}
    >
      <div className="flow-list-drawer__header">
        <Box flexGrow={1}>Select dataflow</Box>
        <Box>
          <IconButton
            startIcon={<CloseIcon />}
            aria-label="close"
            onClick={handleClose}
          />
        </Box>
      </div>
      <div className="flow-list-drawer__content">
        <List>
          {dataflows &&
            dataflows.map((df: DataflowDto) => (
              <ListItemButton key={df.id} onClick={() => handleGetFlow(df)}>
                <ListItem>{df.name}</ListItem>
              </ListItemButton>
            ))}
        </List>
      </div>
    </Drawer>
  );
};
