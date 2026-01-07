import { ThemeProvider } from "@mui/material";
import React, { FC, useEffect, useMemo, useState } from "react";
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
    () => ({ ...props, ...customProps }),
    [props, customProps]
  );
  portalProps = mergedProps;
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
