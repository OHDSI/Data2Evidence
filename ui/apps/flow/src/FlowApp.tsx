import React, { FC } from "react";
import { Provider } from "react-redux";
import { ReactFlowProvider } from "reactflow";
import { ThemeProvider } from "@mui/material";
import { PageProps, SystemAdminPageMetadata } from "@portal/plugin";
import { store } from "./store";
import { theme } from "./theme/theme";
import { FlowLayout } from "./features/flow/containers/FlowLayout";
import { FlowMetadataParams } from ".";
import { PortalProps } from "./types";
import "./monaco";
import "./theme/main.scss";
import "reactflow/dist/style.css";

export interface FlowAppProps
  extends PageProps<SystemAdminPageMetadata<FlowMetadataParams>>,
    PortalProps {
  isStandalone: boolean;
}

export let pluginMetadata:
  | SystemAdminPageMetadata<FlowMetadataParams>
  | undefined;

const FlowApp: FC<FlowAppProps> = ({
  metadata,
  isStandalone,
}: FlowAppProps) => {
  pluginMetadata = metadata;
  if (!pluginMetadata) return;

  return (
    <Provider store={store}>
      <ReactFlowProvider>
        <ThemeProvider theme={theme}>
          <FlowLayout isStandalone={isStandalone} />
        </ThemeProvider>
      </ReactFlowProvider>
    </Provider>
  );
};

export default FlowApp;
