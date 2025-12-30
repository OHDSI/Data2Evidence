import { services } from "../env.ts";
import { get, post } from "../utils/request-util";
import type { IDbCreateDto, IDbDto } from "../utils/type";
import { AxiosRequestConfig } from 'axios'

export class DbCredentialsAPI {
  protected readonly logger = console; //createLogger(this.constructor.name)
  private readonly baseURL: string;
  private readonly accessToken: string;
  constructor(accessToken: string ) {
    this.accessToken = accessToken;
    if (services.trex) {
          this.baseURL = services.trex;
        } else {
          this.logger.error("No url is set for DbCredentialsApi");
          throw new Error("No url is set for DbCredentialsApi");
       }
    }

  private async getRequestConfig() {
      let options: AxiosRequestConfig = {}
  
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
