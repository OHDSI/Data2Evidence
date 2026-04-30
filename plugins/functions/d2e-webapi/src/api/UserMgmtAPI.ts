import { IUserMe } from "./types.ts";
import { env } from "../env.ts";

export class UserMgmtAPI {
  private readonly baseURL: string;
  private readonly logger = console;
  private readonly token: string;
  // deno-lint-ignore no-explicit-any
  private usermgmtapi: any;

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
    // @ts-ignore To ignore Cannot find name 'Trex'
    this.usermgmtapi = Trex.tokioChannel("d2e-functions/alp-usermgmt");
  }

  async getMe(): Promise<IUserMe> {
    try {
      this.logger.info(`Getting /me from portal`);
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/me`;

      const result = await this.usermgmtapi.get(url, options);

      return result.data;
    } catch (error) {
      console.error(`Error while getting /me from portal: ${error}`);
      throw error;
    }
  }

  private getRequestConfig() {
    const options = {
      headers: {
        Authorization: this.token,
      },
    };

    return options;
  }
}
