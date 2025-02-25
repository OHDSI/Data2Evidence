import axios, { AxiosRequestConfig } from "axios";
import memoize from "memoizee";
import { getAuthToken } from "../containers/auth/auth";

const PUBLIC_URLS = ["dataset/public/list", "config/public/overview-description"];
const client = axios.create();

client.interceptors.request.use(
  async (config) => {
    if (!config.url || !PUBLIC_URLS.includes(config.url)) {
      const token = await getAuthToken(false);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const requestNoCache = async <T = any>(options: AxiosRequestConfig): Promise<T> => {
  const onSuccess = function (response: any) {
    console.debug("Request Successful!", response);
    return response.data;
  };

  const onError = function (error: any) {
    console.error("Request Failed:", error.config);

    if (error.response) {
      // Server response error
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
      console.error("Headers:", error.response.headers);
    } else {
      // Request setup error
      console.error("Error Message:", error.message);
    }

    return Promise.reject(error.response || error.message);
  };

  try {
    const response = await client(options);
    return onSuccess(response);
  } catch (error) {
    return onError(error);
  }
};

export const request = memoize(requestNoCache, {
  maxAge: 3000,
  promise: true,
  normalizer: (args) => JSON.stringify(args),
});
