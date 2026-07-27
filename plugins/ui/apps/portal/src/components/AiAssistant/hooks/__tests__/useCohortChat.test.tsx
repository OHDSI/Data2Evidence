import React from "react";
import { act, render, waitFor } from "@testing-library/react";
import { AppProvider } from "../../../../contexts";
import { getAuthToken } from "../../../../containers/auth/auth";
import { CohortChatState, useCohortChat } from "../useCohortChat";

// Capture what the hook hands useChat so the client-side tool round trip can be
// driven directly: the agent asking for a pa_* tool is the crux of this feature,
// and it is not reachable through the DOM.
const mockAddToolOutput = jest.fn();
let capturedInit: any;
// The transcript useChat reports back, so tests can stand up an in-flight tool call.
let mockMessages: any[] = [];
// Where the turn is: "ready" unless a test is standing up one in flight.
let mockStatus = "ready";

jest.mock("../../../../containers/auth/auth", () => ({
  getAuthToken: jest.fn(),
}));

jest.mock("@ai-sdk/react", () => ({
  useChat: (init: any) => {
    capturedInit = init;
    return {
      messages: mockMessages,
      status: mockStatus,
      error: undefined,
      sendMessage: jest.fn(),
      setMessages: jest.fn(),
      clearError: jest.fn(),
      addToolOutput: mockAddToolOutput,
    };
  },
}));

// The latest hook value, so assertions can read derived state and call its actions.
let state: CohortChatState;

const Probe = () => {
  state = useCohortChat();
  return null;
};

const renderHook = () =>
  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );

const publishPaTools = (call: jest.Mock) => {
  (window as any).__d2ePaTools = {
    version: 1,
    datasetId: "ds-1",
    list: () => [{ name: "pa_get_cohort_result", description: "Read the result", inputSchema: { type: "object" } }],
    call,
  };
};

describe("useCohortChat", () => {
  beforeEach(() => {
    capturedInit = undefined;
    mockMessages = [];
    mockStatus = "ready";
    mockAddToolOutput.mockClear();
    // react-scripts runs jest with resetMocks, which strips mock implementations
    // between tests — so this has to be (re)applied here, not at mock definition.
    (getAuthToken as jest.Mock).mockResolvedValue("test-token");
  });

  afterEach(() => {
    delete (window as any).__d2ePaTools;
  });

  it("resubmits automatically once a client tool has produced output", () => {
    renderHook();

    // Without this the loop stalls: the model's tool call is answered but never
    // sent back, so it never gets to use the result.
    expect(typeof capturedInit.sendAutomaticallyWhen).toBe("function");
  });

  // Drives the transport the hook actually built, through a stubbed fetch, because
  // the request it produces is not otherwise observable — and a malformed request
  // reads as a server bug ("messages[] is required") from the outside.
  describe("the request it sends", () => {
    const sendThroughTransport = async () => {
      renderHook();
      const requests: Array<{ url: string; init: any }> = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = jest.fn(async (url: any, init: any) => {
        requests.push({ url, init });
        return new Response(new ReadableStream({ start: (c) => c.close() }), { status: 200 });
      }) as any;

      try {
        await capturedInit.transport.sendMessages({
          chatId: "chat-1",
          messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "female under 100" }] }],
          trigger: "submit-message",
        });
      } catch {
        // The stub response has no UI message stream; only the request matters.
      } finally {
        globalThis.fetch = originalFetch;
      }
      return requests[0];
    };

    it("posts the messages and the live PA tool descriptors", async () => {
      const request = await sendThroughTransport();

      const body = JSON.parse(request.init.body);
      expect(Array.isArray(body.messages)).toBe(true);
      expect(body.messages).toHaveLength(1);
      expect(body).toHaveProperty("paTools");
      expect(String(request.url)).toContain("code-suggestion/agent?datasetId=");
    });

    // Regression: the hook used to add its own Content-Type on top of the
    // transport's. Duplicate keys survive into the header object and Headers()
    // APPENDS them, so the request went out as "application/json, application/json"
    // — which express.json() does not parse, so the server saw an empty body.
    it("sends exactly one valid JSON content-type", async () => {
      const request = await sendThroughTransport();

      expect(new Headers(request.init.headers).get("content-type")).toBe("application/json");
    });

    it("sends the bearer token", async () => {
      const request = await sendThroughTransport();

      expect(new Headers(request.init.headers).get("authorization")).toBe("Bearer test-token");
    });
  });

  it("runs a pa_* tool call against Patient Analytics and returns its output", async () => {
    const call = jest.fn().mockResolvedValue({ content: [{ type: "text", text: '{"currentPatientCount":412}' }] });
    publishPaTools(call);
    renderHook();

    await capturedInit.onToolCall({
      toolCall: { toolCallId: "call-1", toolName: "pa_get_cohort_result", input: { verbose: true } },
    });

    expect(call).toHaveBeenCalledWith("pa_get_cohort_result", { verbose: true });
    await waitFor(() =>
      expect(mockAddToolOutput).toHaveBeenCalledWith({
        tool: "pa_get_cohort_result",
        toolCallId: "call-1",
        output: '{"currentPatientCount":412}',
      })
    );
  });

  // PA can unmount mid-conversation. The model must get an actionable result, not
  // a hung turn waiting for output that will never arrive.
  it("reports an actionable error when Patient Analytics is closed", async () => {
    renderHook();

    await capturedInit.onToolCall({
      toolCall: { toolCallId: "call-2", toolName: "pa_get_cohort_result", input: {} },
    });

    await waitFor(() => expect(mockAddToolOutput).toHaveBeenCalled());
    const { output } = mockAddToolOutput.mock.calls[0][0];
    expect(JSON.parse(output).error).toMatch(/Patient Analytics is not open/i);
  });

  // A server tool reaching the browser means the agent declared something it
  // cannot execute; failing it loudly beats stalling the turn.
  it("fails a non-browser tool call instead of trying to run it", async () => {
    renderHook();

    await capturedInit.onToolCall({
      toolCall: { toolCallId: "call-3", toolName: "search_concepts", input: { query: "sinusitis" } },
    });

    expect(mockAddToolOutput).toHaveBeenCalledWith(
      expect.objectContaining({ toolCallId: "call-3", state: "output-error" })
    );
  });

  // "Thinking" fills the gaps where the turn is running but rendering nothing: the
  // wait for the first token, and the wait after a tool returns. It has to be off
  // whenever something else already shows the work, or it duplicates it.
  describe("thinking", () => {
    const userTurn = { id: "m1", role: "user", parts: [{ type: "text", text: "hi", state: "done" }] };

    // A turn mid-flight: the user's message, plus whatever the assistant has produced
    // so far (nothing at all, before the first chunk lands).
    const inFlight = (parts: any[], status = "streaming") => {
      mockStatus = status;
      mockMessages = parts.length ? [userTurn, { id: "m2", role: "assistant", parts }] : [userTurn];
      renderHook();
    };

    it("thinks while the request is out and nothing has come back", () => {
      inFlight([], "submitted");

      expect(state.isThinking).toBe(true);
    });

    it("stops as soon as the reply starts streaming", () => {
      inFlight([{ type: "text", text: "Building the", state: "streaming" }]);

      expect(state.isThinking).toBe(false);
    });

    // The model often says what it is about to do, then goes quiet to do it.
    it("thinks again once a finished text part is the last thing said", () => {
      inFlight([{ type: "text", text: "Let me look that up.", state: "done" }]);

      expect(state.isThinking).toBe(true);
    });

    // The tool row already says "Running" — two live indicators for one action.
    it("stays quiet while a tool call is in flight", () => {
      inFlight([{ type: "tool-search_concepts", toolCallId: "c1", state: "input-available", input: {} }]);

      expect(state.isThinking).toBe(false);
    });

    it("thinks while the model weighs up a tool result", () => {
      inFlight(
        [{ type: "tool-search_concepts", toolCallId: "c1", state: "output-available", output: {} }],
        "submitted"
      );

      expect(state.isThinking).toBe(true);
    });

    it("is off once the turn is over", () => {
      inFlight([{ type: "text", text: "Done.", state: "done" }], "ready");

      expect(state.isThinking).toBe(false);
    });

    // A parked review is waiting on the user, not on the model.
    it("is off while a concept review is open", () => {
      mockStatus = "ready";
      mockMessages = [
        {
          id: "m1",
          role: "assistant",
          parts: [
            {
              type: "tool-ui_confirm_concepts",
              toolCallId: "call-9",
              state: "input-available",
              input: { conceptSetName: "T2DM", concepts: [{ conceptId: 1, conceptName: "One" }] },
            },
          ],
        },
      ];
      renderHook();

      expect(state.pendingConceptSelection).toBeDefined();
      expect(state.isThinking).toBe(false);
    });
  });

  // ui_confirm_concepts is answered by the user, so the hook's job is to NOT answer
  // it, hold the edits, and send back exactly what was ticked.
  describe("concept confirmation", () => {
    const CONCEPTS = [
      { conceptId: 201826, conceptName: "Type 2 diabetes mellitus", vocabularyId: "SNOMED", conceptCode: "44054006" },
      { conceptId: 443729, conceptName: "Diabetes mellitus type 2", vocabularyId: "ICD10CM", conceptCode: "E11" },
    ];

    const confirmPart = (overrides: any = {}) => ({
      type: "tool-ui_confirm_concepts",
      toolCallId: "call-9",
      state: "input-available",
      input: { conceptSetName: "Type 2 diabetes mellitus", concepts: CONCEPTS },
      ...overrides,
    });

    const withConfirmCall = (overrides: any = {}) => {
      mockMessages = [{ id: "m1", role: "assistant", parts: [confirmPart(overrides)] }];
      renderHook();
    };

    it("leaves the call unanswered so the turn waits for the user", async () => {
      renderHook();

      await capturedInit.onToolCall({
        toolCall: { toolCallId: "call-9", toolName: "ui_confirm_concepts", input: { concepts: CONCEPTS } },
      });

      expect(mockAddToolOutput).not.toHaveBeenCalled();
    });

    it("surfaces the call as a pending selection with everything ticked", () => {
      withConfirmCall();

      expect(state.pendingConceptSelection).toMatchObject({
        toolCallId: "call-9",
        name: "Type 2 diabetes mellitus",
        selectedIds: [201826, 443729],
        resolved: false,
      });
    });

    // The card is the message; a "Ran ui_confirm_concepts" line above it is noise.
    it("keeps the confirmation out of the tool rows", () => {
      withConfirmCall();

      expect(state.messages[0].tools).toHaveLength(0);
      expect(state.messages[0].conceptSelection).toBeDefined();
    });

    // Answering the card resumes the SAME UIMessage, so the reply arrives as another
    // text part on the message that asked the question. Concatenating them printed
    // "your cohort has been created" above the concept list it was created from.
    it("puts the reply to an answered card in a new bubble below it", () => {
      mockMessages = [
        {
          id: "m1",
          role: "assistant",
          parts: [
            { type: "text", text: "Pick the concepts to include." },
            confirmPart({ state: "output-available", output: { approved: true, conceptIds: [201826] } }),
            { type: "text", text: "Your cohort has been created. It contains 21 patients." },
          ],
        },
      ];
      renderHook();

      expect(state.messages).toHaveLength(2);
      expect(state.messages[0].text).toBe("Pick the concepts to include.");
      expect(state.messages[0].conceptSelection).toBeDefined();
      expect(state.messages[1].text).toBe("Your cohort has been created. It contains 21 patients.");
      expect(state.messages[1].conceptSelection).toBeUndefined();
      expect(state.messages[0].id).not.toBe(state.messages[1].id);
    });

    // Same reason: a tool called after the review belongs to the bubble it produced.
    it("attributes tools to the bubble they were called for", () => {
      mockMessages = [
        {
          id: "m1",
          role: "assistant",
          parts: [
            { type: "tool-search_concepts", toolCallId: "c1", state: "output-available", output: {} },
            confirmPart({ state: "output-available", output: { approved: true, conceptIds: [201826] } }),
            { type: "tool-create_concept_set", toolCallId: "c2", state: "output-available", output: {} },
            { type: "text", text: "Done." },
          ],
        },
      ];
      renderHook();

      expect(state.messages.map((m) => m.tools?.map((t) => t.name))).toEqual([
        ["search_concepts"],
        ["create_concept_set"],
      ]);
    });

    // A turn opens as an empty message and fills in as it streams.
    it("renders nothing for a message with no content yet", () => {
      mockMessages = [{ id: "m1", role: "assistant", parts: [] }];
      renderHook();

      expect(state.messages).toHaveLength(0);
    });

    // Model-authored input: a row with no id cannot be turned into a concept set
    // entry, and a duplicate would collide with its twin on the toggle.
    it("drops concepts it cannot identify and de-duplicates the rest", () => {
      withConfirmCall({
        input: {
          conceptSetName: "T2DM",
          concepts: [...CONCEPTS, { conceptName: "No id here" }, { conceptId: 201826, conceptName: "Duplicate" }],
        },
      });

      expect(state.pendingConceptSelection?.concepts.map((c) => c.conceptId)).toEqual([201826, 443729]);
    });

    it("sends back only the concepts left ticked", () => {
      withConfirmCall();

      act(() => state.toggleConcept("call-9", 443729));
      act(() => state.submitConceptSelection(true));

      expect(mockAddToolOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: "ui_confirm_concepts",
          toolCallId: "call-9",
          output: expect.objectContaining({
            approved: true,
            conceptIds: [201826],
            removedConceptIds: [443729],
          }),
        })
      );
    });

    it("puts an unticked concept back", () => {
      withConfirmCall();

      act(() => state.toggleConcept("call-9", 443729));
      act(() => state.toggleConcept("call-9", 443729));

      expect(state.pendingConceptSelection?.selectedIds).toEqual([201826, 443729]);
    });

    // Approving nothing is a rejection with extra steps — the model gets one signal.
    it("reports an all-unticked approval as a rejection", () => {
      withConfirmCall();

      act(() => state.toggleConcept("call-9", 201826));
      act(() => state.toggleConcept("call-9", 443729));
      act(() => state.submitConceptSelection(true));

      expect(mockAddToolOutput.mock.calls[0][0].output).toMatchObject({ approved: false, conceptIds: [] });
    });

    it("reports a rejection without any concepts", () => {
      withConfirmCall();

      act(() => state.submitConceptSelection(false));

      expect(mockAddToolOutput.mock.calls[0][0].output).toMatchObject({ approved: false, conceptIds: [] });
    });

    it("stops treating the call as pending once it has output", () => {
      withConfirmCall({ state: "output-available", output: { approved: true, conceptIds: [201826] } });

      expect(state.pendingConceptSelection).toBeUndefined();
      expect(state.messages[0].conceptSelection?.resolved).toBe(true);
    });
  });

  // ui_choose_concept_set is the reuse gate: the user already has sets for this term,
  // so the hook renders them as the design's numbered cards and sends back exactly
  // which ones were picked — including a subset, once there are three or more.
  describe("existing concept set choice", () => {
    const OPTIONS = [
      { conceptSetId: 11, name: "Alzheimer's disease", note: "Broadest", shortLabel: "AD" },
      { conceptSetId: 12, name: "Early-onset Alzheimer's", note: "Age < 65" },
      { conceptSetId: 13, name: "Alzheimer's + dementia" },
    ];

    const choosePart = (overrides: any = {}) => ({
      type: "tool-ui_choose_concept_set",
      toolCallId: "call-9",
      state: "input-available",
      input: {
        term: "Alzheimer's",
        intro: "Got it. I found a few things to clarify before building your cohort.",
        filterLabel: "This is the basic filter:",
        filterItems: ["Gender: Female", "Age: 60 and above"],
        question: 'For "Alzheimer\'s", I found 3 similar concept sets. Which one did you mean?',
        options: OPTIONS,
        footer: "Reply with 1, 2 or 3, or let me know if neither fits.",
      },
      ...overrides,
    });

    const withChooseCall = (overrides: any = {}) => {
      mockMessages = [{ id: "m1", role: "assistant", parts: [choosePart(overrides)] }];
      renderHook();
    };

    it("leaves the call unanswered so the turn waits for the user", async () => {
      renderHook();

      await capturedInit.onToolCall({
        toolCall: { toolCallId: "call-9", toolName: "ui_choose_concept_set", input: { options: OPTIONS } },
      });

      expect(mockAddToolOutput).not.toHaveBeenCalled();
    });

    // A card with nothing to choose between cannot be rendered, so leaving the call
    // open would park the turn on a question the user never sees.
    it("answers a call with no usable options instead of hanging the turn", async () => {
      renderHook();

      await capturedInit.onToolCall({
        toolCall: { toolCallId: "call-9", toolName: "ui_choose_concept_set", input: { options: [{ name: "x" }] } },
      });

      expect(mockAddToolOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: "ui_choose_concept_set",
          output: expect.objectContaining({ chosen: false, conceptSetIds: [] }),
        })
      );
    });

    it("surfaces the call as a pending choice with nothing ticked yet", () => {
      withChooseCall();

      expect(state.pendingConceptSetChoice).toMatchObject({
        toolCallId: "call-9",
        term: "Alzheimer's",
        selectedIds: [],
        resolved: false,
      });
      expect(state.pendingConceptSetChoice?.options).toHaveLength(3);
    });

    // The Figma layout, straight off the tool input.
    it("builds the rich card the design specifies", () => {
      withChooseCall();

      expect(state.messages[0].rich).toMatchObject({
        intro: "Got it. I found a few things to clarify before building your cohort.",
        filterLabel: "This is the basic filter:",
        filterItems: ["Gender: Female", "Age: 60 and above"],
        footer: "Reply with 1, 2 or 3, or let me know if neither fits.",
      });
      expect(state.messages[0].rich?.options?.map((option) => [option.index, option.title])).toEqual([
        [1, "Alzheimer's disease"],
        [2, "Early-onset Alzheimer's"],
        [3, "Alzheimer's + dementia"],
        [4, "Include all 3 concept sets"],
      ]);
    });

    it("keeps the choice out of the tool rows", () => {
      withChooseCall();

      expect(state.messages[0].tools).toHaveLength(0);
      expect(state.messages[0].conceptSetChoice).toBeDefined();
    });

    it("drops an option with no usable id or name", () => {
      withChooseCall({ input: { term: "x", options: [...OPTIONS, { name: "no id" }, { conceptSetId: 14 }] } });

      expect(state.pendingConceptSetChoice?.options.map((option) => option.conceptSetId)).toEqual([11, 12, 13]);
    });

    it("says Include both for exactly two candidates", () => {
      withChooseCall({ input: { term: "x", options: OPTIONS.slice(0, 2) } });

      expect(state.messages[0].rich?.options?.at(-1)?.title).toBe("Include both concept sets");
    });

    it("offers no combine card for a single candidate", () => {
      withChooseCall({ input: { term: "x", options: OPTIONS.slice(0, 1) } });

      expect(state.messages[0].rich?.options).toHaveLength(1);
    });

    it("ticks and unticks a candidate", () => {
      withChooseCall();

      act(() => state.toggleConceptSetOption("call-9|cs:11"));
      act(() => state.toggleConceptSetOption("call-9|cs:13"));
      expect(state.pendingConceptSetChoice?.selectedIds).toEqual([11, 13]);

      act(() => state.toggleConceptSetOption("call-9|cs:11"));
      expect(state.pendingConceptSetChoice?.selectedIds).toEqual([13]);
    });

    it("ticks everything from the include-all card, and clears it again", () => {
      withChooseCall();

      act(() => state.toggleConceptSetOption("call-9|all"));
      expect(state.pendingConceptSetChoice?.selectedIds).toEqual([11, 12, 13]);

      act(() => state.toggleConceptSetOption("call-9|all"));
      expect(state.pendingConceptSetChoice?.selectedIds).toEqual([]);
    });

    // The reason the cards multi-select at all: "1 and 3 but not 2".
    it("sends exactly the ticked subset", () => {
      withChooseCall();

      act(() => state.toggleConceptSetOption("call-9|cs:11"));
      act(() => state.toggleConceptSetOption("call-9|cs:13"));
      act(() => state.submitConceptSetChoice("call-9|selected"));

      expect(mockAddToolOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: "ui_choose_concept_set",
          toolCallId: "call-9",
          output: expect.objectContaining({
            chosen: true,
            conceptSetIds: [11, 13],
            conceptSetNames: ["Alzheimer's disease", "Alzheimer's + dementia"],
          }),
        })
      );
    });

    it("answers with one set straight from its chip, ignoring what was ticked", () => {
      withChooseCall();

      act(() => state.toggleConceptSetOption("call-9|cs:11"));
      act(() => state.submitConceptSetChoice("call-9|cs:12"));

      expect(mockAddToolOutput.mock.calls[0][0].output).toMatchObject({ chosen: true, conceptSetIds: [12] });
    });

    it("answers with every candidate from the include-all chip", () => {
      withChooseCall();

      act(() => state.submitConceptSetChoice("call-9|all"));

      expect(mockAddToolOutput.mock.calls[0][0].output).toMatchObject({ chosen: true, conceptSetIds: [11, 12, 13] });
    });

    // "Neither fits" is what sends the model on to build a new set.
    it("reports a rejection with no sets and tells the model to build one", () => {
      withChooseCall();

      act(() => state.submitConceptSetChoice("call-9|none"));

      const { output } = mockAddToolOutput.mock.calls[0][0];
      expect(output).toMatchObject({ chosen: false, conceptSetIds: [] });
      expect(output.note).toMatch(/ui_confirm_concepts/);
    });

    // An empty tick list is "I have not picked yet", not "none of these fit".
    it("does not answer an empty selection", () => {
      withChooseCall();

      act(() => state.submitConceptSetChoice("call-9|selected"));

      expect(mockAddToolOutput).not.toHaveBeenCalled();
    });

    // A click on a card belonging to an already-answered question further up the
    // transcript must not overwrite the live one.
    it("ignores an answer aimed at a different tool call", () => {
      withChooseCall();

      act(() => state.submitConceptSetChoice("call-OLD|cs:11"));
      act(() => state.toggleConceptSetOption("call-OLD|cs:11"));

      expect(mockAddToolOutput).not.toHaveBeenCalled();
      expect(state.pendingConceptSetChoice?.selectedIds).toEqual([]);
    });

    it("ignores an id naming a set that is not on offer", () => {
      withChooseCall();

      act(() => state.submitConceptSetChoice("call-9|cs:999"));

      expect(mockAddToolOutput).not.toHaveBeenCalled();
    });

    it("shows what was sent once the call has output", () => {
      withChooseCall({ state: "output-available", output: { chosen: true, conceptSetIds: [11, 13] } });

      expect(state.pendingConceptSetChoice).toBeUndefined();
      expect(state.messages[0].conceptSetChoice).toMatchObject({ resolved: true, selectedIds: [11, 13] });
      expect(state.messages[0].rich?.options?.map((option) => option.selected)).toEqual([true, false, true, false]);
      expect(state.messages[0].rich?.options?.every((option) => option.disabled)).toBe(true);
    });

    it("marks a rejected question as resolved with nothing selected", () => {
      withChooseCall({ state: "output-available", output: { chosen: false, conceptSetIds: [] } });

      expect(state.messages[0].conceptSetChoice).toMatchObject({ resolved: true, rejected: true, selectedIds: [] });
    });
  });
});
