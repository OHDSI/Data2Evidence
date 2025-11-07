import { FC } from "react";
import { PageProps, SystemAdminPageMetadata } from "@portal/plugin";
import { ReactFlowProvider } from "reactflow";
import { ThemeProvider } from "@mui/material";
import { AppProvider } from "./contexts/AppContext";
import { theme } from "./theme/theme";
import { MappingLayout } from "./MappingLayout";
import { MappingMetadataParams } from "./main";
import "./App.css";

export interface AppProps extends PageProps<SystemAdminPageMetadata<MappingMetadataParams>> {}

export let pluginMetadata: SystemAdminPageMetadata<MappingMetadataParams> | undefined;

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
          <MappingLayout {...pluginMetadata.data} />
        </AppProvider>
      </ThemeProvider>
    </ReactFlowProvider>
  );
};
