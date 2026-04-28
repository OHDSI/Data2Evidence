import axios from "axios";

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

export default client;
