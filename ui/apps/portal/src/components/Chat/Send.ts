import env from "../../env";
import { StreamSend, StreamingAdapterObserver } from "@nlux/react";
import fetchRequest from "../../fetch/request";

export const createSend = (datasetId: string, context: string): StreamSend => {
  return async (prompt: string, observer: StreamingAdapterObserver) => {
    const response = await fetchRequest(`${env.REACT_APP_DN_BASE_URL}/code-suggestion/chat?datasetId=${datasetId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: context,
        userInput: prompt,
      }),
    });

    if (response.status !== 200) {
      observer.error(new Error("Failed to connect to the server"));
      return;
    }

    if (!response.body) {
      return;
    }

    const reader = response.body.getReader();
    const textDecoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        const chunk = textDecoder.decode(value, { stream: true });
        buffer += chunk;

        // If we have a newline, process the complete lines
        if (buffer.includes("\n")) {
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              observer.next(trimmedLine);
            }
          }
        } else {
          observer.next(buffer);
        }
      }
    } finally {
      reader.releaseLock();
      observer.complete();
    }
  };
};

export const noOpSend: StreamSend = async (_prompt: string, observer: StreamingAdapterObserver) => {
  observer.complete();
};
