import { FC } from "react";
import { PageProps, SystemAdminPageMetadata } from "@portal/plugin";
import { ReactFlowProvider } from "reactflow";
import { ThemeProvider } from "@mui/material";
import { AppProvider } from "./contexts/AppContext";
import { theme } from "./theme/theme";
import { MappingLayout } from "./MappingLayout";
import "./App.css";

export interface AppProps extends PageProps<SystemAdminPageMetadata<void>> {}

export let pluginMetadata: SystemAdminPageMetadata<void> | undefined;

export const App: FC<AppProps> = ({ metadata }) => {
  pluginMetadata = metadata;
  if (!pluginMetadata) {
    console.warn("Plugin metadata is empty");
    return null;
  }

  return (
    <ReactFlowProvider>
      <ThemeProvider theme={theme}>
        <AppProvider>
          <MappingLayout />
        </AppProvider>
      </ThemeProvider>
    </ReactFlowProvider>
  );
};
