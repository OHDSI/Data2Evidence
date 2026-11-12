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

  // The content check reads the file, so wait until the Add button is enabled.
  const waitForCheck = () => waitFor(() => expect(screen.getByText(ADD)).not.toBeDisabled());

  it("lets an allowed file be added, whatever the extension's case", async () => {
    renderDialog("data.CSV");

    await waitForCheck();
    expect(screen.queryByTestId("feedback")).not.toBeInTheDocument();
  });

  it.each(["analysis.R", "setup.sh", "program.exe", "report.pdf.exe", "Makefile"])(
    "rejects %s with the type error and offers only Cancel",
    async (fileName) => {
      renderDialog(fileName);

      expect(await screen.findByTestId("feedback")).toHaveTextContent(TYPE_ERROR);
      expect(screen.getByTestId("feedback")).toHaveAttribute("data-type", "error");
      expect(screen.queryByText(ADD)).not.toBeInTheDocument();
      expect(screen.getByText("DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__CANCEL")).toBeInTheDocument();
    }
  );

  it("lists only the configured types in the error", async () => {
    renderDialog("cohort.json", { ...CONFIG, allowedExtensions: ["pdf", "csv"] });

    expect(await screen.findByTestId("feedback")).toHaveTextContent(
      "DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__ERROR_TYPE:PDF DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__OR CSV"
    );
  });

  it("rejects an empty file and offers only Cancel", async () => {
    renderDialog("notes.txt", CONFIG, "");

    expect(await screen.findByTestId("feedback")).toHaveTextContent(
      "DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__ERROR_EMPTY"
    );
    expect(screen.queryByText(ADD)).not.toBeInTheDocument();
  });

  it("rejects a file whose content doesn't match its type and offers only Cancel", async () => {
    renderDialog("report.pdf", CONFIG, "MZ this is not a PDF");

    expect(await screen.findByTestId("feedback")).toHaveTextContent(
      "DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__ERROR_CORRUPTED"
    );
    expect(screen.queryByText(ADD)).not.toBeInTheDocument();
  });

  it("accepts a file whose content matches its type", async () => {
    renderDialog("report.pdf", CONFIG, "%PDF-1.7\n1 0 obj");

    await waitForCheck();
    expect(screen.queryByTestId("feedback")).not.toBeInTheDocument();
  });

  // A 10-byte limit stands in for 25 MB, so the test doesn't build a huge file.
  const TINY_LIMIT = { ...CONFIG, maxFileSizeBytes: 10 };

  it("rejects a file over the limit, naming the limit, and offers only Cancel", async () => {
    renderDialog("data.csv", { ...CONFIG, maxFileSizeBytes: 5 * 1024 * 1024 }, "x".repeat(5 * 1024 * 1024 + 1));

    expect(await screen.findByTestId("feedback")).toHaveTextContent(
      "DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__ERROR_TOO_LARGE:5 MB"
    );
    expect(screen.queryByText(ADD)).not.toBeInTheDocument();
  });

  it("accepts a file of exactly the limit", async () => {
    renderDialog("data.csv", TINY_LIMIT, "x".repeat(10));

    await waitForCheck();
    expect(screen.queryByTestId("feedback")).not.toBeInTheDocument();
  });

  it("shows only the type error for a file that is the wrong type and too large", async () => {
    renderDialog("program.exe", TINY_LIMIT, "x".repeat(11));

    expect(await screen.findByTestId("feedback")).toHaveTextContent(TYPE_ERROR);
    expect(screen.getByTestId("feedback")).not.toHaveTextContent("ERROR_TOO_LARGE");
  });

  it("leaves the check to the backend when the config could not be loaded", async () => {
    renderDialog("analysis.R", null);

    await waitForCheck();
    expect(screen.queryByTestId("feedback")).not.toBeInTheDocument();
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
