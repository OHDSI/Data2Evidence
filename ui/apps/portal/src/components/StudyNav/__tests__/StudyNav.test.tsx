import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { StudyNav } from "../StudyNav";
import { Study } from "../../../types";
import { AppProvider } from "../../../contexts";

const studies: Study[] = [
  {
    id: "1",
    tenant: {
      id: "t01",
      name: "tenant-01",
      system: "",
    },
    tokenStudyCode: "token-code",
    schemaName: "cdm",
    type: "type",
    visibilityStatus: "public",
    publicKey: "",
    dataModel: "",
    databaseCode: "",
    paConfigId: "",
    plugin: "",
  },
  {
    id: "2",
    tenant: {
      id: "t02",
      name: "tenant-02",
      system: "",
    },
    tokenStudyCode: "token-code",
    schemaName: "cdm",
    type: "type",
    visibilityStatus: "public",
    publicKey: "",
    dataModel: "",
    databaseCode: "",
    paConfigId: "",
    plugin: "",
  },
];

it("has empty study", () => {
  const handleClick = jest.fn();
  const { queryByTestId } = render(
    <AppProvider>
      <StudyNav studies={undefined} selectedStudyId="" onClick={handleClick} />
    </AppProvider>
  );
  expect(queryByTestId("studynav")).toBeNull();
});

it("renders correctly", () => {
  const handleClick = jest.fn();
  const { queryByTestId } = render(
    <AppProvider>
      <StudyNav studies={studies} selectedStudyId="" onClick={handleClick} />
    </AppProvider>
  );
  expect(queryByTestId("study-nav")).toBeTruthy();
});

it("has 2 tenants with each tenant has one study", () => {
  const handleClick = jest.fn();
  const { queryAllByTestId } = render(
    <AppProvider>
      <StudyNav studies={studies} selectedStudyId="" onClick={handleClick} />
    </AppProvider>
  );
  expect(queryAllByTestId("study-nav-tenant").length).toBe(2);
  expect(queryAllByTestId("study-nav-tenant")[0].childElementCount).toBe(1);
  expect(queryAllByTestId("study-nav-tenant")[1].childElementCount).toBe(1);
});
