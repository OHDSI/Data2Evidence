import axios, { AxiosRequestConfig } from "axios";
import { IUserMe } from "./types.ts";
import { env } from "../env.ts";

export class UserMgmtAPI {
  private readonly baseURL: string;
  private readonly logger = console;
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for UserMgmtAPI!");
    }

    if (env.SERVICE_ROUTES.usermgmt) {
      this.baseURL = env.SERVICE_ROUTES.usermgmt;
    } else {
      this.logger.error("No url is set for UserMgmtAPI");
      throw new Error("No url is set for UserMgmtAPI");
    }
  }

  async getMe(): Promise<IUserMe> {
    try {
      this.logger.info(`Getting /me from portal`);
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/me`;

      const result = await axios.get(url, options);

      return result.data;
    } catch (error) {
      console.error(`Error while getting /me from portal: ${error}`);
      throw error;
    }
  }

  private getRequestConfig() {
    let options: AxiosRequestConfig = {};

    options = {
      headers: {
        Authorization: this.token,
      },
    };

    return options;
  }
}
