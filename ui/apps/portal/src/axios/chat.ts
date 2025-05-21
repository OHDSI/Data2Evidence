import { request } from "./request";

const CHAT_URL = "code-suggestion";

export class Chat {
  public async send(id: string, message: string) {
    return request({
      baseURL: CHAT_URL,
      method: "POST",
      params: { datasetId: id },
      data: {
        code: message,
      },
    });
  }
}
