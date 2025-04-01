import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
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
