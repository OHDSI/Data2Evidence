import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DatasetResourceUploadConfirmDialog from "./DatasetResourceUploadConfirmDialog";

const mockAddResource = jest.fn();

jest.mock("../../../../../contexts", () => ({
  useTranslation: () => ({
    getText: (key: string, params?: string[]) => (params ? `${key}:${params.join("|")}` : key),
    i18nKeys: new Proxy({}, { get: (_target, prop) => prop }),
  }),
}));

jest.mock("../../../../../axios/api", () => ({
  api: { systemPortal: { addResource: (...args: unknown[]) => mockAddResource(...args) } },
}));

jest.mock(
  "@portal/components",
  () => {
    const MockReact = require("react");
    return {
      Button: (props: any) =>
        MockReact.createElement("button", { onClick: props.onClick, disabled: props.disabled }, props.text),
      Dialog: (props: any) =>
        props.open
          ? MockReact.createElement(
              "div",
              null,
              props.feedback?.message &&
                MockReact.createElement(
                  "div",
                  { "data-testid": "feedback", "data-type": props.feedback.type },
                  props.feedback.message
                ),
              props.children
            )
          : null,
      TermsOfUseIcon: () => null,
    };
  },
  { virtual: true }
);

const CONFIG = {
  maxFileSizeBytes: 25 * 1024 * 1024,
  allowedExtensions: ["pdf", "csv", "json", "xlsx", "docx", "sql", "md", "txt"],
};
const TYPE_ERROR =
  "DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__ERROR_TYPE:PDF, CSV, JSON, XLSX, DOCX, SQL, MD DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__OR TXT";
const ADD = "DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__ADD";

// Pass null to simulate a config that failed to load.
const renderDialog = (fileName: string, config: typeof CONFIG | null = CONFIG, content = "content") =>
  render(
    <DatasetResourceUploadConfirmDialog
      datasetId="ds-1"
      file={new File([content], fileName)}
      uploadConfig={config ?? undefined}
      open
    />
  );

describe("DatasetResourceUploadConfirmDialog", () => {
  beforeEach(() => mockAddResource.mockReset());

  it("lets an allowed file be added, whatever the extension's case", () => {
    renderDialog("data.CSV");

    expect(screen.queryByTestId("feedback")).not.toBeInTheDocument();
    expect(screen.getByText(ADD)).toBeInTheDocument();
  });

  it.each(["analysis.R", "setup.sh", "program.exe", "report.pdf.exe", "Makefile"])(
    "rejects %s with the type error and offers only Cancel",
    (fileName) => {
      renderDialog(fileName);

      expect(screen.getByTestId("feedback")).toHaveTextContent(TYPE_ERROR);
      expect(screen.getByTestId("feedback")).toHaveAttribute("data-type", "error");
      expect(screen.queryByText(ADD)).not.toBeInTheDocument();
      expect(screen.getByText("DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__CANCEL")).toBeInTheDocument();
    }
  );

  it("lists only the configured types in the error", () => {
    renderDialog("cohort.json", { ...CONFIG, allowedExtensions: ["pdf", "csv"] });

    expect(screen.getByTestId("feedback")).toHaveTextContent(
      "DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__ERROR_TYPE:PDF DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__OR CSV"
    );
  });

  it("rejects an empty file and offers only Cancel", () => {
    renderDialog("notes.txt", CONFIG, "");

    expect(screen.getByTestId("feedback")).toHaveTextContent("DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__ERROR_EMPTY");
    expect(screen.queryByText(ADD)).not.toBeInTheDocument();
  });

  // A 10-byte limit stands in for 25 MB, so the test doesn't build a huge file.
  const TINY_LIMIT = { ...CONFIG, maxFileSizeBytes: 10 };

  it("rejects a file over the limit, naming the limit, and offers only Cancel", () => {
    renderDialog("data.csv", { ...CONFIG, maxFileSizeBytes: 5 * 1024 * 1024 }, "x".repeat(5 * 1024 * 1024 + 1));

    expect(screen.getByTestId("feedback")).toHaveTextContent(
      "DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__ERROR_TOO_LARGE:5 MB"
    );
    expect(screen.queryByText(ADD)).not.toBeInTheDocument();
  });

  it("accepts a file of exactly the limit", () => {
    renderDialog("data.csv", TINY_LIMIT, "x".repeat(10));

    expect(screen.queryByTestId("feedback")).not.toBeInTheDocument();
    expect(screen.getByText(ADD)).toBeInTheDocument();
  });

  it("shows only the type error for a file that is the wrong type and too large", () => {
    renderDialog("program.exe", TINY_LIMIT, "x".repeat(11));

    expect(screen.getByTestId("feedback")).toHaveTextContent(TYPE_ERROR);
    expect(screen.getByTestId("feedback")).not.toHaveTextContent("ERROR_TOO_LARGE");
  });

  it("leaves the check to the backend when the config could not be loaded", () => {
    renderDialog("analysis.R", null);

    expect(screen.queryByTestId("feedback")).not.toBeInTheDocument();
    expect(screen.getByText(ADD)).toBeInTheDocument();
  });

  it("shows the backend's rejection without the status code prefix", async () => {
    mockAddResource.mockRejectedValue({
      data: { message: "400 - This file type isn't supported. Upload a PDF or CSV file." },
    });
    renderDialog("analysis.R", null);

    fireEvent.click(screen.getByText(ADD));

    await waitFor(() =>
      expect(screen.getByTestId("feedback")).toHaveTextContent(
        /^This file type isn't supported\. Upload a PDF or CSV file\.$/
      )
    );
  });
});
