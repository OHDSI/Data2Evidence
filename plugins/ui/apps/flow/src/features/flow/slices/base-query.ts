import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import { pluginMetadata } from "~/FlowApp";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const createBaseQueryFn =
  (
    baseUrl: string,
  ): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> =>
  async (args, WebApi, extraOptions) => {
    const rawBaseQuery = fetchBaseQuery({
      baseUrl,
      prepareHeaders: async (headers) => {
        if (!pluginMetadata) return headers;

        const token = await pluginMetadata.getToken();
        if (token === null) return headers;

        headers.set("Authorization", `Bearer ${token}`);
        return headers;
      },
    });

    const maxRetries = 3;
    const retryDelay = 10000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await rawBaseQuery(args, WebApi, extraOptions);

      if (
        result.error &&
        result.error.status === "FETCH_ERROR" &&
        attempt < maxRetries
      ) {
        console.warn(
          `[Flow API] ERR_NETWORK_CHANGED, retrying in ${
            retryDelay / 1000
          }s (attempt ${attempt + 1}/${maxRetries})...`,
        );
        await sleep(retryDelay);
        continue;
      }

      return result;
    }

    return rawBaseQuery(args, WebApi, extraOptions);
  };
