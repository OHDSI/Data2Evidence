import axios, { AxiosRequestConfig } from "axios";

const PUBLIC_URLS = ["dataset/public/list", "config/public", "config/public/overview-description"];

// Store the getToken function globally
let getTokenFunction: (() => Promise<string>) | undefined;

export const setTokenProvider = (getToken: () => Promise<string>) => {
  getTokenFunction = getToken;
};

const client = axios.create();

client.interceptors.request.use(
  async (config) => {
    if (!config.url || !PUBLIC_URLS.includes(config.url)) {
      if (getTokenFunction) {
        try {
          const token = await getTokenFunction();
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error("Failed to get auth token:", error);
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const request = async <T = any>(options: AxiosRequestConfig): Promise<T> => {
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
