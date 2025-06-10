import { FC } from "react";
import { PageProps, SystemAdminPageMetadata } from "@portal/plugin";
import { ThemeProvider } from "@mui/material";
import { ConceptMappingProvider } from "./Context/ConceptMappingContext";
import { theme } from "./theme/theme";
import { MappingMetadataParams } from "./main";
import { Overview } from "./Overview/Overview";
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
    <ThemeProvider theme={theme}>
      <ConceptMappingProvider>
        <div className="conceptmapping__container">
          <Overview {...pluginMetadata.data} />
        </div>
      </ConceptMappingProvider>
    </ThemeProvider>
  );
};
