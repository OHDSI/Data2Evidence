import { i18nDefault } from "../../../contexts/app-context/states";
import { replaceParams } from "../../../contexts/app-context/helpers";
import { buildChatTranscript, downloadChatHistory, transcriptFileName } from "../chatTranscript";
import { downloadFile } from "../../../utils/downloadResource";
import type { ChatMessage } from "../types";

jest.mock("../../../utils/downloadResource", () => ({ downloadFile: jest.fn() }));

// The real English bundle, so the transcript is asserted against the wording users get.
const getText = (key: keyof typeof i18nDefault.default, params?: string[]) =>
  replaceParams(i18nDefault.default[key], params);

const EXPORTED_AT = new Date(2026, 7, 13, 14, 32);

const transcript = (messages: ChatMessage[]) => buildChatTranscript(messages, getText, EXPORTED_AT);

describe("buildChatTranscript", () => {
  it("heads the document with the export time", () => {
    const text = transcript([{ id: "m1", role: "user", text: "Female patients over 60" }]);

    expect(text.split("\n\n")[0]).toBe("# D2E AI assistant conversation");
    expect(text).toContain(`_Exported ${EXPORTED_AT.toLocaleString()}_`);
  });

  it("labels each turn with who said it and keeps the text as written", () => {
    const text = transcript([
      { id: "m1", role: "user", text: "Female patients over 60" },
      { id: "m2", role: "assistant", text: "**412 patients** matched." },
    ]);

    expect(text).toContain("## You\n\nFemale patients over 60");
    expect(text).toContain("## D2E AI assistant\n\n**412 patients** matched.");
  });

  // A transcript of the answers without the calls behind them is not a record of what
  // the assistant did to the cohort.
  it("records a tool call with its arguments and result", () => {
    const text = transcript([
      {
        id: "m1",
        role: "assistant",
        text: "Done.",
        tools: [
          {
            id: "t1",
            name: "pa_apply_cohort_patch",
            state: "ok",
            input: { op: "add", attribute: "gender" },
            output: { patients: 412 },
          },
        ],
      },
    ]);

    expect(text).toContain("**Ran `pa_apply_cohort_patch`**");
    expect(text).toContain('Request:\n\n```json\n{\n  "op": "add",\n  "attribute": "gender"\n}\n```');
    expect(text).toContain('Response:\n\n```json\n{\n  "patients": 412\n}\n```');
    // Tools come before the reply they produced, as they do on screen.
    expect(text.indexOf("**Ran `pa_apply_cohort_patch`**")).toBeLessThan(text.indexOf("Done."));
  });

  it("records why a call failed", () => {
    const text = transcript([
      {
        id: "m1",
        role: "assistant",
        tools: [
          {
            id: "t1",
            name: "pa_apply_cohort_patch",
            state: "error",
            errorText: "Patient Analytics is not open.",
          },
        ],
      },
    ]);

    expect(text).toContain("**Failed `pa_apply_cohort_patch`**");
    expect(text).toContain("Error:\n\n```\nPatient Analytics is not open.\n```");
  });

  // The collapsed row in the drawer caps what it pastes into the DOM; a saved record
  // that drops the tail of a concept search is not a record.
  it("does not truncate a long tool result", () => {
    const conceptNames = Array.from({ length: 200 }, (_, index) => `concept-${index}`);
    const text = transcript([
      {
        id: "m1",
        role: "assistant",
        tools: [{ id: "t1", name: "search_concepts", state: "ok", output: { conceptNames } }],
      },
    ]);

    expect(text).toContain("concept-199");
  });

  // Model output can contain fenced code of its own; a three-backtick fence around it
  // would close on the payload's own fence and spill JSON into the prose.
  it("keeps a payload that contains a code fence inside its block", () => {
    const text = transcript([
      {
        id: "m1",
        role: "assistant",
        tools: [{ id: "t1", name: "search_concepts", state: "ok", output: "```\nfenced\n```" }],
      },
    ]);

    expect(text).toContain("````\n```\nfenced\n```\n````");
  });

  // Which concepts were ticked IS the cohort's clinical meaning, so the excluded ones
  // are part of what was decided.
  it("keeps both the kept and the dropped concepts", () => {
    const text = transcript([
      {
        id: "m1",
        role: "assistant",
        conceptSelection: {
          toolCallId: "call-1",
          name: "Type 2 diabetes mellitus",
          intro: "Here is the list of concepts I will include.",
          concepts: [
            {
              conceptId: 201826,
              conceptName: "Type 2 diabetes mellitus",
              vocabularyId: "SNOMED",
              conceptCode: "44054006",
            },
            { conceptId: 443729, conceptName: "Diabetes mellitus type 2", vocabularyId: "ICD10CM", conceptCode: "E11" },
          ],
          selectedIds: [201826],
          resolved: true,
        },
      },
    ]);

    expect(text).toContain("**Type 2 diabetes mellitus**");
    expect(text).toContain("- [x] Type 2 diabetes mellitus — SNOMED 44054006");
    expect(text).toContain("- [ ] Diabetes mellitus type 2 — ICD10CM E11");
    expect(text).toContain("Confirmed with 1 of 2 concepts");
  });

  it("records which concept set the user picked", () => {
    const text = transcript([
      {
        id: "m1",
        role: "assistant",
        rich: {
          intro: "You already have two Alzheimer's sets.",
          filterLabel: "Filters",
          filterItems: ["Age over 60"],
          question: "Which one did you mean?",
          options: [
            { id: "call-9|cs:11", index: 1, title: "Alzheimer's disease", subtitle: "Broadest", selected: true },
            { id: "call-9|cs:12", index: 2, title: "Early-onset Alzheimer's", subtitle: "Age < 65" },
          ],
          footer: "Reply with a number.",
        },
      },
    ]);

    expect(text).toContain("**Filters**\n\n- Age over 60");
    expect(text).toContain("Which one did you mean?");
    expect(text).toContain("- [x] 1. Alzheimer's disease — Broadest");
    expect(text).toContain("- [ ] 2. Early-onset Alzheimer's — Age < 65");
    expect(text).toContain("Reply with a number.");
  });
});

describe("downloadChatHistory", () => {
  it("saves the transcript as a dated markdown file", () => {
    downloadChatHistory([{ id: "m1", role: "user", text: "Hi" }], getText, EXPORTED_AT);

    expect(downloadFile).toHaveBeenCalledWith({
      data: expect.stringContaining("## You\n\nHi"),
      fileName: "d2e-ai-chat-2026-08-13-1432.md",
      fileType: "text/markdown;charset=utf-8",
    });
  });

  it("pads a single-digit month, day and time", () => {
    expect(transcriptFileName(new Date(2026, 0, 5, 9, 7))).toBe("d2e-ai-chat-2026-01-05-0907.md");
  });
});
