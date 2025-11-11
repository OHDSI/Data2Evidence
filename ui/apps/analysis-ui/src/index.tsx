import React from "react";
import * as ReactDOM from "react-dom/client";
import { FlowApp } from "./FlowApp";
import { createMockPortalProps } from "./mock";

const mockPortalProps = createMockPortalProps();

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(<FlowApp {...mockPortalProps} />);
