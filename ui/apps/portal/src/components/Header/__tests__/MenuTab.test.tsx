import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import MenuTab from "../MenuTab/MenuTab";
import { NavLink } from "../../../types";

it("renders correctly", () => {
  const link: NavLink = {
    id: "1",
    path: "/path",
    title: "Navigation",
    submenu: [],
  };
  const { queryByTestId } = render(
    <MemoryRouter>
      <MenuTab link={link} className="" />
    </MemoryRouter>
  );

  expect(queryByTestId("menu-tab")).toBeTruthy();
  expect(queryByTestId("menu-tab-title")).toHaveTextContent("Navigation");
});

it("renders submenu correctly", () => {
  const link: NavLink = {
    id: "1",
    path: "/path",
    title: "Navigation",
    submenu: [
      {
        id: "1.1",
        path: "http://path",
        title: "Sub 1",
      },
      {
        id: "1.2",
        path: "path2",
        title: "Sub 2",
      },
    ],
  };

  const { queryAllByTestId } = render(
    <MemoryRouter>
      <MenuTab link={link} className="" />
    </MemoryRouter>
  );

  expect(queryAllByTestId("menu-tab-anchor").length).toEqual(1);
  expect(queryAllByTestId("menu-tab-link").length).toEqual(1);
});
