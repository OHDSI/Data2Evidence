import axios, { AxiosRequestConfig } from "axios";
import { env } from "../env.ts";
import { Bookmarks } from "./types.ts";

export class BookmarksAPI {
  private readonly baseURL: string;
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for BookmarksAPI!");
    }

    if (env.SERVICE_ROUTES.portalServer) {
      this.baseURL = env.SERVICE_ROUTES.bookmark;
    } else {
      console.error("No url is set for BookmarksAPI");
      throw new Error("No url is set for BookmarksAPI");
    }
  }

  async getAllBookmarks(datasetId, paConfigId): Promise<Bookmarks> {
    const options = await this.getRequestConfig();
    console.log(this.baseURL, this.token);

    const params = new URLSearchParams();
    params.append("datasetId", datasetId);
    params.append("paConfigId", paConfigId);
    params.append("r", Math.random().toString());
    const result = await axios.get(`${this.baseURL}`, { params, ...options });
    console.log(result.data);

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
