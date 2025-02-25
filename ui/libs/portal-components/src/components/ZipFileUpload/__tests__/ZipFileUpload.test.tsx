import React from "react";
import { render, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { ZipFileUpload } from "../ZipFileUpload";

afterEach(() => {
  jest.clearAllMocks();
});

it("should not support non-zip", async () => {
  const handleFileUpload = jest.fn();
  const { getByTestId } = render(<ZipFileUpload onUpload={handleFileUpload} />);

  const fileSelector = getByTestId("file");
  const file = new File(["a,b"], "not_supported.png", { type: "image/png" });
  fireEvent.change(fileSelector, { target: { files: [file] } });

  expect(handleFileUpload).toBeCalledTimes(0);
});

it("should support zip", async () => {
  const handleFileUpload = jest.fn();
  const { getByTestId } = render(<ZipFileUpload onUpload={handleFileUpload} />);

  const fileSelector = getByTestId("file");
  const file = new File(["a,b"], "supported.zip", { type: "application/zip" });
  fireEvent.change(fileSelector, { target: { files: [file] } });

  expect(handleFileUpload).toBeCalledTimes(1);
});
