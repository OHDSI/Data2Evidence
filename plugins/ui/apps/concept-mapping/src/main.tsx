import React from "react";
import ReactDOM from "react-dom/client";
import { SystemAdminPageMetadata } from "@portal/plugin";
import { App, AppProps } from "./App.tsx";
import { ConceptMappingState } from "./types/concept-mapping.ts";
import { initialState } from "./Context/ConceptMappingContext.tsx";

export interface MappingMetadataParams {
  locale?: string;
  data: ConceptMappingState;
  onChange: (data: Partial<ConceptMappingState>) => void;
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
