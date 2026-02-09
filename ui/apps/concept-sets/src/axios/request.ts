import axios, { AxiosRequestConfig } from "axios";
import memoize from "memoizee";

let globalGetToken: (() => Promise<string>) | null = null;

export const setTokenGetter = (getToken: () => Promise<string>) => {
  globalGetToken = getToken;
};

const client = axios.create();

client.interceptors.request.use(
  async (config) => {
    if (globalGetToken) {
      const token = await globalGetToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Retry logic for ERR_NETWORK_CHANGED errors (Docker container restarts during e2e tests)
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    const isNetworkChanged =
      error.code === "ERR_NETWORK" ||
      error.message?.includes("ERR_NETWORK_CHANGED");

    if (isNetworkChanged) {
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount < 3) {
        config.__retryCount += 1;
        console.warn(
          `[Concept Sets API] ERR_NETWORK_CHANGED, retrying in 10s (attempt ${config.__retryCount}/3)...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 10000));
        return client.request(config);
      }
    }

    return Promise.reject(error);
  },
);

const requestNoCache = async <T = any>(
  options: AxiosRequestConfig,
): Promise<T> => {
  const onSuccess = function (response: any) {
    console.debug("Request Successful!", response);
    return response.data;
  };

  const onError = function (error: any) {
    // Skip canceled request errors
    if (axios.isCancel(error) || error?.message === "canceled") {
      return Promise.reject(error.message || error);
    }
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

const memoizedRequest = memoize(requestNoCache, {
  maxAge: 3000,
  promise: true,
  normalizer: (args) => {
    const [options] = args;
    return JSON.stringify(options);
  },
});

export const request = <T = any>(options: AxiosRequestConfig): Promise<T> => {
  if (options.signal) {
    return requestNoCache(options);
  }
  return memoizedRequest(options);
};
