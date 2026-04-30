import axios, { AxiosRequestConfig } from "axios";
import { pluginMetadata } from "../App";

const client = axios.create();

client.interceptors.request.use(
  async (config) => {
    if (pluginMetadata) {
      const token = await pluginMetadata.getToken();
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
        console.warn(`[Mapping API] ERR_NETWORK_CHANGED, retrying in 10s (attempt ${config.__retryCount}/3)...`);
        await new Promise((resolve) => setTimeout(resolve, 10000));
        return client.request(config);
      }
    }

    return Promise.reject(error);
  }
);

const request = <T = any>(options: AxiosRequestConfig): Promise<T> => {
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

  return client(options).then(onSuccess).catch(onError);
};

export default request;
