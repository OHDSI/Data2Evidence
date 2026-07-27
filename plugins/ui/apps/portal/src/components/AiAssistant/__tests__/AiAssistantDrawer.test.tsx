import React from "react";
import { render, fireEvent, within } from "@testing-library/react";
import { AiAssistantDrawer } from "../AiAssistantDrawer";
import { AI_ASSISTANT_TOGGLE_EVENT, PA_LEFT_PANE_OPENED_EVENT } from "../aiAssistantEvents";
import { AppProvider } from "../../../contexts";
import type { CohortChatState } from "../hooks/useCohortChat";
import type { ChatMessage, ToolActivity } from "../types";

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
  error: undefined,
};

jest.mock("../hooks/useCohortChat", () => ({
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
