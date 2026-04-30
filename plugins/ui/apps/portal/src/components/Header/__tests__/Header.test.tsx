import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Header } from "../Header";
import { Tenant, Study } from "../../../types";
import { AppProvider } from "../../../contexts";

const tenant: Tenant = {
  id: "t01",
  name: "Tenant 01",
  system: "",
};

const study: Partial<Study> = {
  id: "s01",
  tenant,
};

jest.mock("../../../containers/auth", () => ({
  isAuthenticated: () => false,
}));

// Mock the environment
jest.mock("../../../env", () => ({
  REACT_APP_IDP_NAME_PROP: "name",
  REACT_APP_PUBLIC_WEBAPI_PROXY_URL: "http://localhost:3001",
}));

it("render correctly", () => {
  const { queryByTestId } = render(
    <AppProvider>
      <MemoryRouter>
        <Header portalType="researcher" />
      </MemoryRouter>
    </AppProvider>
  );

  expect(queryByTestId("header")).toBeTruthy();
});

it("has 2 navigation menu", () => {
  const { queryByTestId } = render(
    <AppProvider>
      <MemoryRouter>
        <Header portalType="researcher" />
      </MemoryRouter>
    </AppProvider>
  );

  expect(queryByTestId("nav")?.childElementCount).toBe(1);
});
