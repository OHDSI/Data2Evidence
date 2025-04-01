import React, { FC } from "react";
import * as ReactDOM from "react-dom/client";
import { SystemAdminPageMetadata } from "@portal/plugin";
import { plugin } from "./module";
import { FlowAppProps } from "./FlowApp";

const mockMetadata: SystemAdminPageMetadata<void> = {
  system: "Local",
  userId: "Mock user",
  getToken: () => Promise.resolve("MockToken"),
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
