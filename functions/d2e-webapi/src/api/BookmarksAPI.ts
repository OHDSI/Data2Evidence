import axios, { AxiosRequestConfig } from "axios";
import { env } from "../env.ts";
import { IBookmarks } from "./types.ts";

export class BookmarksAPI {
  private readonly baseURL: string;
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for BookmarksAPI!");
    }

    if (env.SERVICE_ROUTES.bookmark) {
      this.baseURL = env.SERVICE_ROUTES.bookmark;
    } else {
      console.error("No url is set for BookmarksAPI");
      throw new Error("No url is set for BookmarksAPI");
    }
  }

  async getAllBookmarks(datasetId): Promise<IBookmarks> {
    const options = await this.getRequestConfig();
    const params = new URLSearchParams();
    params.append("datasetId", datasetId);
    params.append("r", Math.random().toString());
    const result = await axios.get(`${this.baseURL}`, { params, ...options });
    return result.data;
  }

  private getRequestConfig() {
    let options: AxiosRequestConfig = {};

    options = {
      headers: {
        Authorization: this.token,
      },
      timeout: 20000,
    };

    return options;
  }
}
