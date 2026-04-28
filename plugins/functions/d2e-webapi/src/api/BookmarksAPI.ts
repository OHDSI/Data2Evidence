import { env } from "../env.ts";
import { IBookmarks } from "./types.ts";

export class BookmarksAPI {
  private readonly baseURL: string;
  private readonly token: string;
  // deno-lint-ignore no-explicit-any
  private bookmarkapi: any;

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

    // @ts-ignore To ignore Cannot find name 'Trex'
    this.bookmarkapi = Trex.tokioChannel("d2e-functions/bookmark-svc");
  }

  async getAllBookmarks(datasetId: string): Promise<IBookmarks> {
    const options = await this.getRequestConfig();
    const url = new URL(this.baseURL);
    url.searchParams.set("datasetId", datasetId);
    const result = await this.bookmarkapi.get(url.toString(), options);
    return result.data;
  }

  private getRequestConfig() {
    const options = {
      headers: {
        Authorization: this.token,
      },
      timeout: 20000,
    };

    return options;
  }
}
