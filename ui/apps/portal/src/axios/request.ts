import axios, { AxiosRequestConfig } from "axios";
import memoize from "memoizee";
import { getAuthToken } from "../containers/auth/auth";
import { isOidcAuthenticated } from "../containers/auth/oidc/oidc";

const PUBLIC_URL_PREFIXES = ["dataset/public/list", "config/public"];
const isPublicUrl = (url?: string) => !!url && PUBLIC_URL_PREFIXES.some((prefix) => url.startsWith(prefix));

const client = axios.create();

client.interceptors.request.use(
  async (config) => {
    if (!isPublicUrl(config.url) && isOidcAuthenticated()) {
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

// Retry logic for ERR_NETWORK_CHANGED errors (Docker container restarts during e2e tests)
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    const isNetworkChanged = error.code === "ERR_NETWORK" || error.message?.includes("ERR_NETWORK_CHANGED");

    if (isNetworkChanged) {
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount < 3) {
        config.__retryCount += 1;
        console.warn(`[Portal API] ERR_NETWORK_CHANGED, retrying in 10s (attempt ${config.__retryCount}/3)...`);
        await new Promise((resolve) => setTimeout(resolve, 10000));
        return client.request(config);
      }
    }

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
  maxAge: 800,
  promise: true,
  normalizer: (args) => JSON.stringify(args),
});
