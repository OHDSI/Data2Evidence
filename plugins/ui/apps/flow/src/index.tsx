import React, { FC } from "react";
import * as ReactDOM from "react-dom/client";
import { SystemAdminPageMetadata } from "@portal/plugin";
import { plugin } from "./module";
import { FlowAppProps } from "./FlowApp";

export interface FlowMetadataParams {
  dnBaseUrl: string;
  mappingSuggestion: boolean;
}

const mockMetadata: SystemAdminPageMetadata<FlowMetadataParams> = {
  system: "Local",
  userId: "Mock user",
  getToken: () => Promise.resolve("MockToken"),
  data: {
    dnBaseUrl: "https://localhost:41100/",
    mappingSuggestion: false,
  },
};

const pageProps: FlowAppProps = {
  metadata: mockMetadata,
  isStandalone: true,
};

const PluginTester: FC = () => {
  const Page = plugin.page;
  return <Page {...pageProps} />;
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PluginTester />);
