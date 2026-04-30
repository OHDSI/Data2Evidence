import React, { FC, useState, useEffect, useMemo } from "react";
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

const FlowApp: FC<FlowAppProps> = (props: FlowAppProps) => {
  const [customProps, setCustomProps] = useState<Partial<PortalProps>>({});

  useEffect(() => {
    const handlePropsChange = (event: Event) => {
      const { appId, ...newProps } = (event as CustomEvent).detail || {};
      if (appId === props.appId) {
        setCustomProps(newProps);
      }
    };

    window.addEventListener("custom-props-changed", handlePropsChange);
    return () => {
      window.removeEventListener("custom-props-changed", handlePropsChange);
    };
  }, [props.appId]);

  const mergedProps = useMemo(
    () => ({
      ...props,
      ...customProps,
    }),
    [props, customProps],
  );

  pluginMetadata =
    mergedProps as unknown as SystemAdminPageMetadata<FlowMetadataParams>;

  if (!pluginMetadata) return null;

  return (
    <Provider store={store}>
      <ReactFlowProvider>
        <ThemeProvider theme={theme}>
          <FlowLayout isStandalone={mergedProps.isStandalone} />
        </ThemeProvider>
      </ReactFlowProvider>
    </Provider>
  );
};

export default FlowApp;
