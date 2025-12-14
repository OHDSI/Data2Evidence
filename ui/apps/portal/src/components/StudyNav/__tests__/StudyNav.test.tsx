import React from "react";
import { render } from "@testing-library/react";
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

// Mock the environment
jest.mock("../../../env", () => ({
  REACT_APP_IDP_NAME_PROP: "name",
  REACT_APP_PUBLIC_WEBAPI_PROXY_URL: "http://localhost:3001",
}));

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
