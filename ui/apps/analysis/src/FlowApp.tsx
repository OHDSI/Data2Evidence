import React, { FC } from "react";
import { Provider } from "react-redux";
import { ReactFlowProvider } from "reactflow";
import { ThemeProvider } from "@mui/material";
import { PageProps, SystemAdminPageMetadata } from "@portal/plugin";
import { store } from "./store";
import { theme } from "./theme/theme";
import { FlowLayout } from "./features/flow/containers/FlowLayout";
import "./monaco";
import "./theme/main.scss";
import "reactflow/dist/style.css";

export interface FlowAppProps extends PageProps<SystemAdminPageMetadata<void>> {
  isStandalone: boolean;
}

export let pluginMetadata: SystemAdminPageMetadata<void> | undefined;

export const FlowApp: FC<FlowAppProps> = ({
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
