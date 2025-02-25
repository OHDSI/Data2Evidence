import React from "react";
import { render, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { CsvReader } from "../CsvReader";
import { AppProvider } from "../../../contexts";

afterEach(() => {
  jest.clearAllMocks();
});

it("should trigger readAsText", async () => {
  const handleFileLoaded = jest.fn();
  const readAsTextSpy = jest.spyOn(FileReader.prototype, "readAsText");
  const { getByTestId } = render(
    <AppProvider>
      <CsvReader onFileLoaded={handleFileLoaded} />
    </AppProvider>
  );

  const fileSelector = getByTestId("file");
  const file = new File(["a,b"], "test.csv", { type: "text/csv" });
  fireEvent.change(fileSelector, { target: { files: [file] } });

  expect(readAsTextSpy).toBeCalledTimes(1);
});

it("should not support png", async () => {
  const handleFileLoaded = jest.fn();
  const readAsTextSpy = jest.spyOn(FileReader.prototype, "readAsText");
  const { getByTestId } = render(
    <AppProvider>
      <CsvReader onFileLoaded={handleFileLoaded} />
    </AppProvider>
  );

  const fileSelector = getByTestId("file");
  const file = new File(["a,b"], "not_supported.png", { type: "image/png" });
  fireEvent.change(fileSelector, { target: { files: [file] } });

  expect(readAsTextSpy).toBeCalledTimes(0);
});
