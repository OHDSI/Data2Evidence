import { StreamSend, StreamingAdapterObserver } from "@nlux/react";
import fetchRequest from "../../fetch/request";

export const createSend = (datasetId: string, context: string): StreamSend => {
  return async (prompt: string, observer: StreamingAdapterObserver) => {
    const response = await fetchRequest(`code-suggestion/chat?datasetId=${datasetId}`, {
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

    try {
      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        const chunk = textDecoder.decode(value, { stream: true });
        observer.next(chunk);
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
