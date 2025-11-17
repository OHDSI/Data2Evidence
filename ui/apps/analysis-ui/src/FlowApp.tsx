import { ThemeProvider } from "@mui/material";
import React, { FC } from "react";
import { Provider } from "react-redux";
import { ReactFlowProvider } from "reactflow";
import { FlowLayout } from "./features/flow/containers/FlowLayout";
import { store } from "./store";
import { theme } from "./theme/theme";
import { PortalProps } from "./types/portal";
import "reactflow/dist/style.css";
import "./monaco";
import "./theme/main.scss";

export interface FlowAppProps extends PortalProps {}

export let portalProps: PortalProps | undefined;

export const FlowApp: FC<FlowAppProps> = (props: FlowAppProps) => {
  portalProps = props;
  if (!portalProps) return;

  return (
    <Provider store={store}>
      <ReactFlowProvider>
        <ThemeProvider theme={theme}>
          <FlowLayout isStandalone={props.isAtlas} />
        </ThemeProvider>
      </ReactFlowProvider>
    </Provider>
  );
};
