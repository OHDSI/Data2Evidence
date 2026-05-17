import fetchRequest from "../../../fetch/request";
import type { ChatSession, StreamCallbacks } from "../types";

/** Thrown by {@link streamMessage} when the backend returns 404 (stale session). */
export class SessionExpiredError extends Error {
  constructor() {
    super("Session expired — a new session will be created automatically.");
    this.name = "SessionExpiredError";
  }
}

const BASE = "ai-assistant";

export async function createSession(datasetId: string, context?: string): Promise<ChatSession> {
  const response = await fetchRequest(`${BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ datasetId, context }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.status}`);
  }

  return response.json();
}

export async function streamMessage(sessionId: string, userInput: string, callbacks: StreamCallbacks): Promise<void> {
  const response = await fetchRequest(`${BASE}/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userInput }),
  });

  if (!response.ok) {
    if (response.status === 404) throw new SessionExpiredError();
    callbacks.onError(`Request failed: ${response.status}`);
    return;
  }

  if (!response.body) {
    callbacks.onError("No response body");
    return;
  }

  const reader = (response.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are delimited by double newlines
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const raw of events) {
        dispatchSseEvent(raw.trim(), callbacks);
      }
    }

    // Flush any remaining buffer
    if (buffer.trim()) dispatchSseEvent(buffer.trim(), callbacks);

    callbacks.onDone();
  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : String(err));
  } finally {
    reader.releaseLock();
  }
}

function dispatchSseEvent(raw: string, callbacks: StreamCallbacks): void {
  if (!raw) return;

  const lines = raw.split("\n");
  let eventType = "message";
  let dataStr = "";

  for (const line of lines) {
    if (line.startsWith("event: ")) {
      eventType = line.slice(7).trim();
    } else if (line.startsWith("data: ")) {
      dataStr = line.slice(6).trim();
    }
  }

  if (!dataStr) return;

  try {
    const data = JSON.parse(dataStr);
    switch (eventType) {
      case "token":
        callbacks.onToken(data.delta ?? "");
        break;
      case "tool_call_start":
        callbacks.onToolStart(data.id, data.name, data.args ?? {});
        break;
      case "tool_call_end":
        callbacks.onToolEnd(data.id, data.name, data.ok ?? true, data.summary ?? "");
        break;
      case "artifact":
        callbacks.onArtifact(data.kind, data.payload ?? {});
        break;
      case "error":
        callbacks.onError(data.message ?? "Unknown error");
        break;
    }
  } catch {
    // Ignore malformed SSE data
  }
}
