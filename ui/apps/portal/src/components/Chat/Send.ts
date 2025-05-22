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
          if (buffer) {
            // Process any remaining data in the buffer
            observer.next(buffer);
          }
          break;
        }

        // Decode the chunk and add it to our buffer
        const chunk = textDecoder.decode(value, { stream: true });
        buffer += chunk;
        console.log("Current buffer:", buffer);

        // process multiple lines first
        if (buffer.includes("\n")) {
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep the last incomplete line in the buffer

          for (const line of lines) {
            if (line.trim()) {
              // Only process non-empty lines
              observer.next(line);
            }
          }
        } else if (done) {
          observer.next(buffer); // process single line in buffer
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
