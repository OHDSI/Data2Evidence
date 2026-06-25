import fetchRequest from "../../../fetch/request";
import type { StreamCallbacks } from "../types";

const BASE = "code-suggestion";

/** A single prior conversation turn sent to the backend for context. */
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export async function streamMessage(
  datasetId: string,
  userInput: string,
  callbacks: StreamCallbacks,
  history: ChatTurn[] = [],
  context = ""
): Promise<void> {
  const response = await fetchRequest(`${BASE}/cohort?datasetId=${encodeURIComponent(datasetId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userInput, context, history }),
  });

  if (!response.ok) {
    callbacks.onError(`Request failed: ${response.status}`);
    return;
  }

  if (!response.body) {
    callbacks.onError("No response body");
    return;
  }

  const reader = (response.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      if (chunk) {
        callbacks.onToken(chunk);
      }
    }

    callbacks.onDone();
  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : String(err));
  } finally {
    reader.releaseLock();
  }
}
