import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import { portalProps } from "~/FlowApp";

export const createBaseQueryFn =
  (
    baseUrl: string
  ): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> =>
  async (args, WebApi, extraOptions) => {
    const rawBaseQuery = fetchBaseQuery({
      baseUrl,
      prepareHeaders: async (headers) => {
        if (!portalProps) return headers;

        const token = await portalProps.getToken();
        if (token === null) return headers;

        headers.set("Authorization", `Bearer ${token}`);

        const datasetId = portalProps.datasetId;

        if (datasetId) {
          headers.set("datasetid", datasetId);
        }
        return headers;
      },
    });
    return rawBaseQuery(args, WebApi, extraOptions);
  };
