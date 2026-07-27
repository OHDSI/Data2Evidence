import React from "react";
import { render, fireEvent, within } from "@testing-library/react";
import { AiAssistantDrawer } from "../AiAssistantDrawer";
import { AI_ASSISTANT_TOGGLE_EVENT, PA_LEFT_PANE_OPENED_EVENT } from "../aiAssistantEvents";
import { AppProvider } from "../../../contexts";
import type { CohortChatState } from "../hooks/useCohortChat";
import type { ChatMessage, ConceptSelection, ConceptSetChoice, ToolActivity } from "../types";

// The drawer is a shell around useCohortChat; the hook owns the agent round trip.
// Stubbing it keeps these tests about what the drawer renders and which callbacks
// it wires, rather than about streaming.
const mockChatState: CohortChatState = {
  messages: [],
  sendMessage: jest.fn(),
  reset: jest.fn(),
  isStreaming: false,
  liveEditing: true,
  datasetMismatch: false,
  datasetMissing: false,
  pendingConceptSelection: undefined,
  toggleConcept: jest.fn(),
  submitConceptSelection: jest.fn(),
  pendingConceptSetChoice: undefined,
  toggleConceptSetOption: jest.fn(),
  submitConceptSetChoice: jest.fn(),
  error: undefined,
};

// Only the hook is stubbed: the drawer also imports the choice-id helpers from this
// module to build its chips, and a bare factory would leave those undefined.
jest.mock("../hooks/useCohortChat", () => ({
  ...jest.requireActual("../hooks/useCohortChat"),
  useCohortChat: () => mockChatState,
}));

const setChat = (overrides: Partial<CohortChatState>) => Object.assign(mockChatState, overrides);

const renderDrawer = (onClose = jest.fn()) => {
  const utils = render(
    <AppProvider>
      <AiAssistantDrawer open onClose={onClose} />
    </AppProvider>
  );
  return { ...utils, onClose };
};

describe("AiAssistantDrawer", () => {
  beforeEach(() => {
    setChat({
      messages: [],
      sendMessage: jest.fn(),
      reset: jest.fn(),
      isStreaming: false,
      liveEditing: true,
      datasetMismatch: false,
      datasetMissing: false,
      pendingConceptSelection: undefined,
      toggleConcept: jest.fn(),
      submitConceptSelection: jest.fn(),
      pendingConceptSetChoice: undefined,
      toggleConceptSetOption: jest.fn(),
      submitConceptSetChoice: jest.fn(),
      error: undefined,
    });
  });

  it("renders the welcome state with greeting and suggestions", () => {
    const { getByText, getByTestId } = renderDrawer();

    expect(getByText("Hi, how can I help you?")).toBeInTheDocument();
    expect(getByTestId("ai-suggestion-build-cohort")).toHaveTextContent("Help me to build cohort");
  });

  it("sends the suggestion prompt when a suggestion is clicked", () => {
    const { getByTestId } = renderDrawer();

    fireEvent.click(getByTestId("ai-suggestion-build-cohort"));

    expect(mockChatState.sendMessage).toHaveBeenCalledWith("Help me to build cohort");
  });

  it("sends a typed message via the composer", () => {
    const { getByTestId } = renderDrawer();

    fireEvent.change(getByTestId("ai-assistant-input"), { target: { value: "Female patients over 60" } });
    fireEvent.click(getByTestId("ai-assistant-send"));

    expect(mockChatState.sendMessage).toHaveBeenCalledWith("Female patients over 60");
  });

  it("renders the conversation and the tools the assistant used", () => {
    setChat({
      messages: [
        { id: "m1", role: "user", text: "Female patients over 60" },
        {
          id: "m2",
          role: "assistant",
          text: "Built the cohort — 412 patients.",
          tools: [{ id: "t1", name: "pa_apply_cohort_patch", state: "ok" }],
        },
      ],
    });
    const { getByTestId, queryByText } = renderDrawer();

    const conversation = getByTestId("ai-assistant-conversation");
    expect(within(conversation).getByText("Female patients over 60")).toBeInTheDocument();
    expect(within(conversation).getByText("Built the cohort — 412 patients.")).toBeInTheDocument();
    expect(within(conversation).getByTestId("ai-tool-pa_apply_cohort_patch")).toHaveTextContent("apply_cohort_patch");
    // Welcome greeting is gone once a conversation is active.
    expect(queryByText("Hi, how can I help you?")).not.toBeInTheDocument();
  });

  // The tools are what the assistant did, not part of what it said. Rendering them
  // inside the reply bubble made a cohort edit read like a badge on a sentence.
  describe("tool calls", () => {
    const toolMessage = (tool: ToolActivity): ChatMessage => ({
      id: "m1",
      role: "assistant",
      text: "Done.",
      tools: [tool],
    });

    it("renders tool rows outside the reply bubble", () => {
      setChat({ messages: [toolMessage({ id: "t1", name: "pa_apply_cohort_patch", state: "ok" })] });
      const { getByTestId } = renderDrawer();

      const row = getByTestId("ai-tool-pa_apply_cohort_patch");
      expect(row.closest(".ai-assistant__bubble")).toBeNull();
      expect(row.closest(".ai-assistant__message")).toBeInTheDocument();
      expect(row).toHaveTextContent("Ran");
    });

    it("labels a call that is still running", () => {
      setChat({ messages: [toolMessage({ id: "t1", name: "pa_get_cohort_state", state: "running" })] });
      const { getByTestId } = renderDrawer();

      expect(getByTestId("ai-tool-pa_get_cohort_state")).toHaveTextContent("Running");
    });

    // Seeing the arguments and the result is what makes "it edited my cohort" checkable.
    it("expands to show the call arguments and result", () => {
      setChat({
        messages: [
          toolMessage({
            id: "t1",
            name: "pa_apply_cohort_patch",
            state: "ok",
            input: { op: "add", attribute: "gender" },
            output: { patients: 412 },
          }),
        ],
      });
      const { getByTestId, queryByTestId } = renderDrawer();

      expect(queryByTestId("ai-tool-detail-pa_apply_cohort_patch")).not.toBeInTheDocument();

      fireEvent.click(getByTestId("ai-tool-toggle-pa_apply_cohort_patch"));

      const detail = getByTestId("ai-tool-detail-pa_apply_cohort_patch");
      expect(detail).toHaveTextContent('"attribute": "gender"');
      expect(detail).toHaveTextContent('"patients": 412');

      fireEvent.click(getByTestId("ai-tool-toggle-pa_apply_cohort_patch"));
      expect(queryByTestId("ai-tool-detail-pa_apply_cohort_patch")).not.toBeInTheDocument();
    });

    it("shows why a call failed", () => {
      setChat({
        messages: [
          toolMessage({
            id: "t1",
            name: "pa_apply_cohort_patch",
            state: "error",
            input: { op: "add" },
            errorText: "Patient Analytics is not open.",
          }),
        ],
      });
      const { getByTestId } = renderDrawer();

      expect(getByTestId("ai-tool-pa_apply_cohort_patch")).toHaveTextContent("Failed");
      fireEvent.click(getByTestId("ai-tool-toggle-pa_apply_cohort_patch"));
      expect(getByTestId("ai-tool-detail-pa_apply_cohort_patch")).toHaveTextContent("Patient Analytics is not open.");
    });

    // A turn that has only called tools so far has no prose to put in a bubble.
    it("renders no empty bubble while a tool runs before any text", () => {
      setChat({
        messages: [{ id: "m1", role: "assistant", text: "", tools: [{ id: "t1", name: "pa_x", state: "running" }] }],
      });
      const { getByTestId } = renderDrawer();

      expect(getByTestId("ai-assistant-conversation").querySelector(".ai-assistant__bubble")).toBeNull();
    });
  });

  // The concept list is the cohort's clinical meaning, so it is the user's to correct
  // before a set is written. The card and the approve chip are two halves of one gate:
  // the card is in the conversation, the chip is down in the composer.
  describe("concept selection", () => {
    const selection = (overrides: Partial<ConceptSelection> = {}): ConceptSelection => ({
      toolCallId: "call-1",
      name: "Type 2 diabetes mellitus",
      intro: "Here is the list of concepts I will include.",
      concepts: [
        { conceptId: 201826, conceptName: "Type 2 diabetes mellitus", vocabularyId: "SNOMED", conceptCode: "44054006" },
        { conceptId: 443729, conceptName: "Diabetes mellitus type 2", vocabularyId: "ICD10CM", conceptCode: "E11" },
      ],
      selectedIds: [201826, 443729],
      resolved: false,
      ...overrides,
    });

    const pending = (overrides: Partial<ConceptSelection> = {}) => {
      const conceptSelection = selection(overrides);
      setChat({
        messages: [{ id: "m1", role: "assistant", text: "", conceptSelection }],
        pendingConceptSelection: conceptSelection,
      });
      return conceptSelection;
    };

    it("lists the proposed concepts with their vocabulary code", () => {
      pending();
      const { getByTestId } = renderDrawer();

      const card = getByTestId("ai-concept-selection");
      expect(card).toHaveTextContent("Type 2 diabetes mellitus");
      expect(within(card).getByTestId("ai-concept-201826")).toHaveTextContent("SNOMED 44054006");
      expect(within(card).getByTestId("ai-concept-443729")).toHaveTextContent("ICD10CM E11");
      expect(getByTestId("ai-concept-count")).toHaveTextContent("2 of 2 concepts selected");
    });

    // search_concepts does not always carry a source code, and the OMOP id is what the
    // set is actually built from — so it is the fallback rather than a blank line.
    it("falls back to the OMOP concept id when there is no source code", () => {
      pending({
        concepts: [{ conceptId: 201826, conceptName: "Type 2 diabetes mellitus", vocabularyId: "SNOMED" }],
        selectedIds: [201826],
      });
      const { getByTestId } = renderDrawer();

      expect(getByTestId("ai-concept-201826")).toHaveTextContent("SNOMED 201826");
    });

    it("unticks a concept through the remove button", () => {
      pending();
      const { getByTestId } = renderDrawer();

      fireEvent.click(getByTestId("ai-concept-toggle-443729"));

      expect(mockChatState.toggleConcept).toHaveBeenCalledWith("call-1", 443729);
    });

    // A removed row stays put so a stray click costs one more click, not a round trip
    // through the model.
    it("shows an unticked concept as struck through with a restore control", () => {
      pending({ selectedIds: [201826] });
      const { getByTestId } = renderDrawer();

      expect(getByTestId("ai-concept-443729")).toHaveClass("ai-assistant__concept--excluded");
      expect(getByTestId("ai-concept-toggle-443729")).toHaveClass("ai-assistant__concept-toggle--restore");
      expect(getByTestId("ai-concept-count")).toHaveTextContent("1 of 2 concepts selected");
    });

    it("approves the set from the composer chip", () => {
      pending();
      const { getByTestId } = renderDrawer();

      fireEvent.click(getByTestId("ai-quick-reply-approve-concepts"));

      expect(mockChatState.submitConceptSelection).toHaveBeenCalledWith(true);
    });

    it("rejects the set from the composer chip", () => {
      pending();
      const { getByTestId } = renderDrawer();

      fireEvent.click(getByTestId("ai-quick-reply-reject-concepts"));

      expect(mockChatState.submitConceptSelection).toHaveBeenCalledWith(false);
    });

    // "Approve concept set" with nothing ticked would do the opposite of what it says.
    it("cannot approve an empty selection", () => {
      pending({ selectedIds: [] });
      const { getByTestId } = renderDrawer();

      expect(getByTestId("ai-quick-reply-approve-concepts")).toBeDisabled();
      expect(getByTestId("ai-quick-reply-reject-concepts")).toBeEnabled();
    });

    // The agent's turn is parked on the confirmation tool call, so a free-text message
    // sent into that gap would reach the model as a transcript with an unanswered call.
    it("parks the composer until the request is answered", () => {
      pending();
      const { getByTestId } = renderDrawer();

      expect(getByTestId("ai-assistant-input")).toBeDisabled();
      expect(getByTestId("ai-assistant-notice")).toHaveTextContent("Review the concepts above");
    });

    // Once answered the card is a record of what was sent, not a live prompt.
    it("locks the card and drops the chips once answered", () => {
      const conceptSelection = selection({ selectedIds: [201826], resolved: true });
      setChat({
        messages: [{ id: "m1", role: "assistant", text: "Created the concept set.", conceptSelection }],
        pendingConceptSelection: undefined,
      });
      const { getByTestId, queryByTestId } = renderDrawer();

      expect(queryByTestId("ai-concept-toggle-201826")).not.toBeInTheDocument();
      expect(queryByTestId("ai-quick-reply-approve-concepts")).not.toBeInTheDocument();
      expect(getByTestId("ai-assistant-input")).toBeEnabled();
      expect(getByTestId("ai-concept-count")).toHaveTextContent("Confirmed with 1 of 2 concepts");
    });
  });

  // Picking between concept sets the user ALREADY has (Figma 1475:126506) — the answer
  // to "build me an Alzheimer's cohort" when they have three Alzheimer's sets already.
  describe("existing concept set choice", () => {
    const OPTIONS = [
      { conceptSetId: 11, name: "Alzheimer's disease", note: "Broadest", shortLabel: "AD" },
      { conceptSetId: 12, name: "Early-onset Alzheimer's", note: "Age < 65" },
      { conceptSetId: 13, name: "Alzheimer's + dementia", note: "Adds unspecified dementia" },
    ];

    const choice = (overrides: Partial<ConceptSetChoice> = {}): ConceptSetChoice => ({
      toolCallId: "call-9",
      term: "Alzheimer's",
      options: OPTIONS,
      selectedIds: [],
      rejected: false,
      resolved: false,
      ...overrides,
    });

    const pendingChoice = (overrides: Partial<ConceptSetChoice> = {}) => {
      const conceptSetChoice = choice(overrides);
      setChat({
        messages: [
          {
            id: "m1",
            role: "assistant",
            rich: {
              question: 'For "Alzheimer\'s", I found 3 similar concept sets. Which one did you mean?',
              options: [
                ...conceptSetChoice.options.map((option, index) => ({
                  id: `call-9|cs:${option.conceptSetId}`,
                  index: index + 1,
                  title: option.name,
                  subtitle: option.note,
                  selected: conceptSetChoice.selectedIds.includes(option.conceptSetId),
                  disabled: conceptSetChoice.resolved,
                })),
                {
                  id: "call-9|all",
                  index: 4,
                  title: "Include all 3 concept sets",
                  selected: conceptSetChoice.selectedIds.length === 3,
                  disabled: conceptSetChoice.resolved,
                },
              ],
            },
            conceptSetChoice,
          },
        ],
        pendingConceptSetChoice: conceptSetChoice.resolved ? undefined : conceptSetChoice,
      });
      return conceptSetChoice;
    };

    it("numbers every candidate and appends an include-all card", () => {
      pendingChoice();
      const { getByTestId } = renderDrawer();

      expect(getByTestId("ai-option-call-9|cs:11")).toHaveTextContent("1.Alzheimer's disease");
      expect(getByTestId("ai-option-call-9|cs:13")).toHaveTextContent("3.Alzheimer's + dementia");
      expect(getByTestId("ai-option-call-9|all")).toHaveTextContent("4.Include all 3 concept sets");
    });

    // The whole point of the card: the user's own sets are offered instead of a
    // proposal to create a fourth one.
    it("shows how each candidate differs so they can be told apart", () => {
      pendingChoice();
      const { getByTestId } = renderDrawer();

      expect(getByTestId("ai-option-call-9|cs:12")).toHaveTextContent("Age < 65");
    });

    it("ticks a candidate rather than answering when its card is clicked", () => {
      pendingChoice();
      const { getByTestId } = renderDrawer();

      fireEvent.click(getByTestId("ai-option-call-9|cs:11"));

      expect(mockChatState.toggleConceptSetOption).toHaveBeenCalledWith("call-9|cs:11");
      expect(mockChatState.submitConceptSetChoice).not.toHaveBeenCalled();
    });

    it("answers immediately from a numbered chip", () => {
      pendingChoice();
      const { getByTestId } = renderDrawer();

      fireEvent.click(getByTestId("ai-quick-reply-call-9|cs:12"));

      expect(mockChatState.submitConceptSetChoice).toHaveBeenCalledWith("call-9|cs:12");
    });

    it("uses the model's short label on the chip where it gave one", () => {
      pendingChoice();
      const { getByTestId } = renderDrawer();

      expect(getByTestId("ai-quick-reply-call-9|cs:11")).toHaveTextContent("1. AD");
      // No shortLabel — the full name is better than nothing.
      expect(getByTestId("ai-quick-reply-call-9|cs:12")).toHaveTextContent("2. Early-onset Alzheimer's");
    });

    // With three or more candidates "one, or all of them" cannot express "1 and 3",
    // and combining sets the user did not pick would silently widen the cohort.
    it("offers a confirm chip only once a genuine subset is ticked", () => {
      pendingChoice({ selectedIds: [11, 13] });
      const { getByTestId } = renderDrawer();

      const confirm = getByTestId("ai-quick-reply-call-9|selected");
      expect(confirm).toHaveTextContent("Use selected (2)");

      fireEvent.click(confirm);
      expect(mockChatState.submitConceptSetChoice).toHaveBeenCalledWith("call-9|selected");
    });

    it("hides the confirm chip when nothing is ticked", () => {
      pendingChoice();
      const { queryByTestId } = renderDrawer();

      expect(queryByTestId("ai-quick-reply-call-9|selected")).not.toBeInTheDocument();
    });

    // Everything ticked is what the "All 3" chip already says.
    it("hides the confirm chip when every candidate is ticked", () => {
      pendingChoice({ selectedIds: [11, 12, 13] });
      const { queryByTestId } = renderDrawer();

      expect(queryByTestId("ai-quick-reply-call-9|selected")).not.toBeInTheDocument();
    });

    it("says All 3 rather than Both once past two candidates", () => {
      pendingChoice();
      const { getByTestId } = renderDrawer();

      expect(getByTestId("ai-quick-reply-call-9|all")).toHaveTextContent("4. All 3");
    });

    it("says Both for exactly two candidates", () => {
      pendingChoice({ options: OPTIONS.slice(0, 2) });
      const { getByTestId } = renderDrawer();

      expect(getByTestId("ai-quick-reply-call-9|all")).toHaveTextContent("3. Both");
    });

    // One candidate is not a choice between sets, so there is nothing to combine.
    it("drops the include-all chip for a single candidate", () => {
      pendingChoice({ options: OPTIONS.slice(0, 1) });
      const { queryByTestId } = renderDrawer();

      expect(queryByTestId("ai-quick-reply-call-9|all")).not.toBeInTheDocument();
    });

    it("lets the user reject every candidate", () => {
      pendingChoice();
      const { getByTestId } = renderDrawer();

      fireEvent.click(getByTestId("ai-quick-reply-call-9|none"));

      expect(mockChatState.submitConceptSetChoice).toHaveBeenCalledWith("call-9|none");
    });

    it("parks the composer until the question is answered", () => {
      pendingChoice();
      const { getByTestId } = renderDrawer();

      expect(getByTestId("ai-assistant-input")).toBeDisabled();
      expect(getByTestId("ai-assistant-notice")).toHaveTextContent("Pick one of the concept sets above");
    });

    it("locks the cards and drops the chips once answered", () => {
      pendingChoice({ selectedIds: [11], resolved: true });
      const { getByTestId, queryByTestId } = renderDrawer();

      expect(getByTestId("ai-option-call-9|cs:11")).toBeDisabled();
      expect(queryByTestId("ai-quick-reply-call-9|none")).not.toBeInTheDocument();
      expect(getByTestId("ai-assistant-input")).toBeEnabled();
    });
  });

  // The model answers in markdown. Rendering it verbatim showed users the asterisks and
  // hashes instead of the formatting they stand for.
  it("renders an assistant reply as markdown", () => {
    setChat({
      messages: [
        {
          id: "m1",
          role: "assistant",
          text: "**412 patients** matched:\n\n- Female\n- Age over 60\n\nRun `pa_apply_cohort_patch` to apply.",
        },
      ],
    });
    const { getByTestId } = renderDrawer();

    const conversation = getByTestId("ai-assistant-conversation");
    expect(conversation.querySelector("strong")).toHaveTextContent("412 patients");
    expect([...conversation.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["Female", "Age over 60"]);
    expect(conversation.querySelector("code")).toHaveTextContent("pa_apply_cohort_patch");
    // The markdown source itself must not leak through.
    expect(conversation.textContent).not.toContain("**");
  });

  // A user's prompt is not markdown: typed asterisks are theirs to keep.
  it("keeps a user message as plain text", () => {
    setChat({ messages: [{ id: "m1", role: "user", text: "**not** bold" }] });
    const { getByTestId } = renderDrawer();

    const conversation = getByTestId("ai-assistant-conversation");
    expect(conversation.querySelector("strong")).toBeNull();
    expect(conversation).toHaveTextContent("**not** bold");
  });

  // The composer is a one-row textarea, so without this a multi-line prompt scrolls
  // inside a single visible line.
  describe("input growth", () => {
    const withContentHeight = (height: number) =>
      jest.spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get").mockReturnValue(height);

    afterEach(() => jest.restoreAllMocks());

    it("grows the input to fit the typed text", () => {
      withContentHeight(63);
      const { getByTestId } = renderDrawer();
      const input = getByTestId("ai-assistant-input");

      fireEvent.change(input, { target: { value: "line one\nline two\nline three" } });

      expect(input).toHaveStyle({ height: "63px" });
    });

    it("stops growing at the maximum height and scrolls instead", () => {
      withContentHeight(400);
      const { getByTestId } = renderDrawer();
      const input = getByTestId("ai-assistant-input");

      fireEvent.change(input, { target: { value: "a\n".repeat(40) } });

      expect(input).toHaveStyle({ height: "126px" });
    });

    it("shrinks back to one line after sending", () => {
      const contentHeight = withContentHeight(63);
      const { getByTestId } = renderDrawer();
      const input = getByTestId("ai-assistant-input");
      fireEvent.change(input, { target: { value: "line one\nline two\nline three" } });

      contentHeight.mockReturnValue(21);
      fireEvent.click(getByTestId("ai-assistant-send"));

      expect(input).toHaveStyle({ height: "21px" });
    });
  });

  it("blocks sending while the assistant is answering", () => {
    setChat({ isStreaming: true });
    const { getByTestId } = renderDrawer();

    expect(getByTestId("ai-assistant-input")).toBeDisabled();
    expect(getByTestId("ai-assistant-send")).toBeDisabled();
  });

  it("calls onClose when the close button is clicked", () => {
    const { getByTestId, onClose } = renderDrawer();

    fireEvent.click(getByTestId("ai-assistant-close"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Live cohort editing needs Patient Analytics mounted on the same dataset. When
  // it is not, the drawer has to say so — degrading silently is how the assistant
  // ends up looking broken when it is merely out of reach of the builder.
  describe("live editing availability", () => {
    it("tells the user to open the cohort builder when PA is not mounted", () => {
      setChat({ liveEditing: false });
      const { getByTestId } = renderDrawer();

      expect(getByTestId("ai-assistant-notice")).toHaveTextContent(/Open the cohort builder/i);
    });

    it("flags a dataset mismatch between the builder and the portal", () => {
      setChat({ liveEditing: false, datasetMismatch: true });
      const { getByTestId } = renderDrawer();

      expect(getByTestId("ai-assistant-notice")).toHaveTextContent(/different dataset/i);
    });

    it("asks for a dataset and disables input when none is selected", () => {
      setChat({ liveEditing: false, datasetMissing: true });
      const { getByTestId } = renderDrawer();

      expect(getByTestId("ai-assistant-notice")).toHaveTextContent(/Select a dataset/i);
      expect(getByTestId("ai-assistant-input")).toBeDisabled();
    });

    it("surfaces an agent error over the availability notice", () => {
      setChat({ liveEditing: false, error: new Error("AI_MODEL is not configured") });
      const { getByTestId } = renderDrawer();

      expect(getByTestId("ai-assistant-notice")).toHaveTextContent("AI_MODEL is not configured");
    });

    it("reduces an HTML error page to its message instead of rendering the markup", () => {
      // What a 413 from express looks like on the wire — the transport hands the
      // response body straight to error.message.
      setChat({
        error: new Error(
          '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Error</title>\n</head>\n' +
            "<body>\n<pre>PayloadTooLargeError: request entity too large<br> &nbsp; &nbsp;at IncomingMessage.onData " +
            "(file:///var/tmp/sb-compile-trex/node_modules/localhost/raw-body/2.5.3/index.js:260:12)</pre>\n</body>\n</html>"
        ),
      });
      const { getByTestId } = renderDrawer();

      const notice = getByTestId("ai-assistant-notice");
      expect(notice).toHaveTextContent("PayloadTooLargeError: request entity too large");
      expect(notice.textContent).not.toMatch(/DOCTYPE|<pre>|IncomingMessage/);
    });

    it("shows no notice when everything is wired up", () => {
      const { queryByTestId } = renderDrawer();

      expect(queryByTestId("ai-assistant-notice")).not.toBeInTheDocument();
    });
  });

  // On wide viewports the panel is inset out of the page content by the CSS rule
  // `.ai-assistant--open ~ main`, so the open flag has to reach the drawer root and that root
  // has to stay a sibling of <main>.
  describe("docked layout", () => {
    const renderWithMain = (open: boolean) =>
      render(
        <AppProvider>
          <AiAssistantDrawer open={open} onClose={jest.fn()} />
          <main />
        </AppProvider>
      );

    it("marks the drawer root as open so the page content can be inset", () => {
      const { container } = renderWithMain(true);

      expect(container.querySelector(".ai-assistant--open ~ main")).toBeInTheDocument();
    });

    it("leaves the page content full width while closed", () => {
      const { container } = renderWithMain(false);

      expect(container.querySelector(".ai-assistant")).toBeInTheDocument();
      expect(container.querySelector(".ai-assistant--open ~ main")).not.toBeInTheDocument();
    });
  });

  // Plugin apps (Patient Analytics) run in this same window under single-spa and give up
  // their own side panes while the drawer is docked, coordinated over window events.
  describe("plugin pane handshake", () => {
    it("broadcasts the open state so plugins can make room", () => {
      const onToggle = jest.fn();
      window.addEventListener(AI_ASSISTANT_TOGGLE_EVENT, onToggle);

      const { rerender } = render(
        <AppProvider>
          <AiAssistantDrawer open={false} onClose={jest.fn()} />
        </AppProvider>
      );
      expect(onToggle.mock.calls.at(-1)?.[0].detail).toEqual({ open: false });

      rerender(
        <AppProvider>
          <AiAssistantDrawer open onClose={jest.fn()} />
        </AppProvider>
      );
      expect(onToggle.mock.calls.at(-1)?.[0].detail).toEqual({ open: true });
      // Readable too, for plugins that mount after the drawer was opened and missed the event.
      expect(window.__alpAiAssistantOpen).toBe(true);

      window.removeEventListener(AI_ASSISTANT_TOGGLE_EVENT, onToggle);
    });

    it("closes when a plugin re-opens the pane it gave up", () => {
      const { onClose } = renderDrawer();

      window.dispatchEvent(new CustomEvent(PA_LEFT_PANE_OPENED_EVENT));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("ignores the pane event while already closed", () => {
      const onClose = jest.fn();
      render(
        <AppProvider>
          <AiAssistantDrawer open={false} onClose={onClose} />
        </AppProvider>
      );

      window.dispatchEvent(new CustomEvent(PA_LEFT_PANE_OPENED_EVENT));

      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
