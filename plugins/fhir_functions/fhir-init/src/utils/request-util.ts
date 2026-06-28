import axios, { AxiosRequestConfig } from "npm:axios";
import { env } from "../env.ts";

const logger = console;

axios.defaults.timeout = 300000;

if (env.NODE_ENV === "development") {
  logger.info("rejectUnauthorized is disabled");
}

axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    logger.error(`${error?.config?.method} ${error?.config?.url} ${error}`);
    throw error;
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
