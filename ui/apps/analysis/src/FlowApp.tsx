import { ThemeProvider } from "@mui/material";
import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import React, { FC } from "react";
import { Provider } from "react-redux";
import { ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";
import { FlowLayout } from "./features/flow/containers/FlowLayout";
import "./monaco";
import { store } from "./store";
import "./theme/main.scss";
import { theme } from "./theme/theme";

export interface FlowAppProps extends PageProps<ResearcherStudyMetadata> {
  isStandalone: boolean;
}

export let pluginMetadata: ResearcherStudyMetadata | undefined;

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
