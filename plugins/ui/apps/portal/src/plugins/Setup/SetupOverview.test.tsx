import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SetupOverview } from "./SetupOverview";

jest.mock("../../env", () => ({}));

jest.mock("../core/SetupPluginRenderer", () => ({
  SetupPluginRenderer: () => null,
}));

jest.mock("../../utils", () => ({
  loadPlugins: () => ({
    setup: [
      { name: "Databases", route: "db", visible: true, pluginPath: "plugins/Setup/Db/module" },
      {
        name: "Plugins",
        route: "plugins",
        visible: true,
        featureFlag: "trexPlugins",
        pluginPath: "plugins/Setup/TrexPlugins/module",
      },
    ],
  }),
}));

const enabledFeaturesMock: { value: string[] } = { value: [] };
jest.mock("../../hooks", () => ({
  useEnabledFeatures: () => [enabledFeaturesMock.value, false, undefined],
}));

jest.mock("../../contexts", () => ({
  useTranslation: () => ({ getText: (k: string) => k, i18nKeys: { SETUP_OVERVIEW__SETUP: "Setup" } }),
}));

beforeEach(() => {
  enabledFeaturesMock.value = [];
});

test("SetupOverview hides items whose featureFlag is not enabled", () => {
  render(
    <MemoryRouter>
      <SetupOverview />
    </MemoryRouter>
  );
  expect(screen.getByText("Databases")).toBeInTheDocument();
  expect(screen.queryByText("Plugins")).not.toBeInTheDocument();
});

test("SetupOverview shows items whose featureFlag is enabled", () => {
  enabledFeaturesMock.value = ["trexPlugins"];
  render(
    <MemoryRouter>
      <SetupOverview />
    </MemoryRouter>
  );
  expect(screen.getByText("Plugins")).toBeInTheDocument();
});
