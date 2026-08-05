import "@fontsource-variable/ibm-plex-sans";
import React from "react";
import ReactDOM from "react-dom/client";
import { SystemAdminPageMetadata } from "@portal/plugin";
import { App, AppProps } from "./App.tsx";
import { ConceptMappingState } from "./types/concept-mapping.ts";
import { initialState } from "./Context/ConceptMappingContext.tsx";
import { SourceNodeDTO } from "./types/source";

export interface MappingMetadataParams {
  locale?: string;
  data: ConceptMappingState;
  onChange: (data: Partial<ConceptMappingState>) => void;
  sourceNode?: SourceNodeDTO;
  // Removes the incoming canvas edge from this Concept Mapping node's upstream source node.
  // Wired up by the flow app's ConceptMappingDrawer; a no-op host (e.g. this app's own
  // local dev harness below) can simply omit it.
  onDisconnectSource?: () => void;
  // Persists this node and closes the drawer, then prompts the user to save the dataflow
  // canvas. Wired up by the flow app's ConceptMappingDrawer to open the shared SaveFlowDialog.
  onSaveAndClose?: () => void;
}

const mockMetadata: SystemAdminPageMetadata<MappingMetadataParams> = {
  system: "Local1",
  userId: "Mock user",
  getToken: () => Promise.resolve("MockToken"),
  data: {
    locale: "en",
    data: initialState,
    onChange: () => {},
  },
};

const pageProps: AppProps = {
  metadata: mockMetadata,
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div
      style={{
        minHeight: 56,
        background: "#fbfbfd",
        boxShadow: "0 .5px 8px 0 #acaba8",
        fontSize: 24,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
      }}
    >
      Portal Header
    </div>
    <App {...pageProps} />
  </React.StrictMode>
);
