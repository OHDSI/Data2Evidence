import React from "react";
import { render, waitFor } from "@testing-library/react";
import { AppProvider } from "../../../../contexts";
import { getAuthToken } from "../../../../containers/auth/auth";
import { useCohortChat } from "../useCohortChat";

// Capture what the hook hands useChat so the client-side tool round trip can be
// driven directly: the agent asking for a pa_* tool is the crux of this feature,
// and it is not reachable through the DOM.
const mockAddToolOutput = jest.fn();
let capturedInit: any;

jest.mock("../../../../containers/auth/auth", () => ({
  getAuthToken: jest.fn(),
}));

jest.mock("@ai-sdk/react", () => ({
  useChat: (init: any) => {
    capturedInit = init;
    return {
      messages: [],
      status: "ready",
      error: undefined,
      sendMessage: jest.fn(),
      setMessages: jest.fn(),
      clearError: jest.fn(),
      addToolOutput: mockAddToolOutput,
    };
  },
}));

const Probe = () => {
  useCohortChat();
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
});
