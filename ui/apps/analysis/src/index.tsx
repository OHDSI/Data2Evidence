import { ResearcherStudyMetadata } from "@portal/plugin";
import React, { FC } from "react";
import * as ReactDOM from "react-dom/client";
import { FlowAppProps } from "./FlowApp";
import { plugin } from "./module";

const mockMetadata: ResearcherStudyMetadata = {
  userId: "Mock user",
  getToken: () => Promise.resolve("MockToken"),
  tenantId: "mock-tenant",
  studyId: "mock-dataset-id",
  releaseId: "mock-release",
  data: {},
  fetchMenu: () => {},
  subFeatureFlags: {},
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
