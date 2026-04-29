import axios, { AxiosRequestConfig } from "axios";
import env from "../env";

export class PublicWebapiProxyAPI {
  private readonly baseURL: string;

  constructor() {
    this.baseURL = env.REACT_APP_PUBLIC_WEBAPI_PROXY_URL;
    if (!this.baseURL && env.REACT_APP_USE_PUBLIC_WEBAPI_PROXY === "true") {
      throw new Error("No url is set for PublicWebapiProxyAPI");
    }
  }

  private async getRequestConfig() {
    const options: AxiosRequestConfig = {};
    return options;
  }

  // Function to map key to uppercase
  mapDcResultKeysToUppercase = (data: unknown[]) => {
    return data.map((obj: any) => {
      return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toUpperCase(), v]));
    });
  };

  async getDataCharacterizationResults(dataSource: string, sourceKey: string): Promise<any> {
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/cdmresults/${dataSource}/${sourceKey}`;
      const result = await axios.get(url, options);

      // Map result keys to uppercase
      let dcResults;
      if (Array.isArray(result.data)) {
        dcResults = this.mapDcResultKeysToUppercase(result.data);
      } else {
        const dcResultsKeys = Object.keys(result.data);
        dcResults = Object.fromEntries(
          dcResultsKeys.map((key) => [key, this.mapDcResultKeysToUppercase(result.data[key] as [])])
        );
      }

      return dcResults;
    } catch (error) {
      console.error(error);
      throw new Error(`Error while getting data characterization results from public webapi`);
    }
  }

  async getDataCharacterizationResultsDrilldown(
    dataSource: string,
    sourceKey: string,
    conceptId: string
  ): Promise<any> {
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/cdmresults/${dataSource}/${sourceKey}/${conceptId}`;
      const result = await axios.get(url, options);

      // Map result keys to uppercase
      let dcResults;
      if (Array.isArray(result.data)) {
        dcResults = this.mapDcResultKeysToUppercase(result.data);
      } else {
        const dcResultsKeys = Object.keys(result.data);
        dcResults = Object.fromEntries(
          dcResultsKeys.map((key) => [key, this.mapDcResultKeysToUppercase(result.data[key] as [])])
        );
      }

      return dcResults;
    } catch (error) {
      console.error(error);
      throw new Error(`Error while getting data characterization drilldown results from public webapi`);
    }
  }
}
