import https from "node:https";
import axios, { AxiosRequestConfig } from "npm:axios";
import * as dotenv from "npm:dotenv";
import { env } from "../env.ts";
dotenv.config();

const logger = console;

axios.defaults.timeout = 30000;

if (env.NODE_ENV === "development") {
  // const httpsAgent = new https.Agent({
  //   rejectUnauthorized: false,
  // });
  // axios.defaults.httpsAgent = httpsAgent;
  logger.info("rejectUnauthorized is disabled");
}

axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    logger.error(`${error?.config?.method} ${error?.config?.url} ${error}`);
    return error.response;
  }
);

export const get = <T = any>(url: string, config?: AxiosRequestConfig) => {
  return axios.get<T>(url, config);
};

export const post = <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
) => {
  return axios.post<T>(url, data, config);
};

export const put = <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
) => {
  return axios.put<T>(url, data, config);
};

export const del = <T = any>(url: string, config?: AxiosRequestConfig) => {
  return axios.delete<T>(url, config);
};
