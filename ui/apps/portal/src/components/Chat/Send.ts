import env from "../../env";
import { StreamSend, StreamingAdapterObserver } from "@nlux/react";
import fetchRequest from "../../fetch/request";

export const createSend = (datasetId: string): StreamSend => {
  return async (prompt: string, observer: StreamingAdapterObserver) => {
    const response = await fetchRequest(`${env.REACT_APP_DN_BASE_URL}/code-suggestion/chat?datasetId=${datasetId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatHistory: "",
        userInput: prompt,
        AIResponse: "",
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

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      const content = textDecoder.decode(value);
      if (content) {
        observer.next(content);
      }
    }

    observer.complete();
  };
};

export const noOpSend: StreamSend = async (_prompt: string, observer: StreamingAdapterObserver) => {
  observer.complete();
};
