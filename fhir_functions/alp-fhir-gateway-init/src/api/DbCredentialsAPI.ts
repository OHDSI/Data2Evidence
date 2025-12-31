import { env, services } from "../env.ts";
import { get, post } from "../utils/request-util";
import type { IDbCreateDto, IDbDto } from "../utils/type";

export class DbCredentialsAPI {
  protected readonly logger = console; //createLogger(this.constructor.name)
  private readonly baseURL: string;
  private accessToken: string;
  private readonly oauthUrl: string;

  constructor() {
    this.accessToken = "";
    this.oauthUrl = env.ALP_GATEWAY_OAUTH__URL;
    if (services.trex) {
          this.baseURL = services.trex;
        } else {
          this.logger.error("No url is set for DbCredentialsApi");
          throw new Error("No url is set for DbCredentialsApi");
       }
    }
  
    async getClientCredentialsToken() {
        try{
            const params = {
                grant_type: "client_credentials",
                client_id: env.IDP__ALP_DATA__CLIENT_ID,
                client_secret: env.IDP__ALP_DATA__CLIENT_SECRET,
            };

            const options = {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                httpAgent: this.agent,
            };

            const data = Object.keys(params)
                .map(
                    (key) =>
                        `${encodeURIComponent(key)}=${encodeURIComponent(
                            params[key]
                        )}`
                )
                .join("&");
            const result = await post(this.oauthUrl, data, options);
            this.accessToken = `Bearer ${result.data.access_token}`;
            return this.accessToken;
        }catch(error: any){
            console.error(`Error obtaining client credentials token: ${error.response?.data || error.message}`);
            throw error;
        }
    }

  private async getRequestConfig() {
      let options = {}
      options = {
        headers: {
          Authorization: this.accessToken
        }
      }
  
      return options;
    }

  async getDbList(): Promise<IDbDto[]> {
    try {
      this.logger.info("Get database list");
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/trex/db/`;
      const result = await get(url, options);
      return result.data;
    } catch (error) {
      console.error(`Error while getting database list: ${error}`);
      throw error;
    }
  }

  async createDb(dto: IDbCreateDto) {
    try {
      this.logger.info("Create database");
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/trex/db/`;
      const result = await post(url, dto, options);
      return result.data;
    } catch (error) {
      console.error(`Error while creating database: ${error}`);
      throw error;
    }
  }
}
