import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import { pluginMetadata } from "~/FlowApp";

export const baseQueryFn: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, WebApi, extraOptions) => {
  const rawBaseQuery = fetchBaseQuery({
    baseUrl: "dataflow-mgmt/",
    prepareHeaders: async (headers) => {
      if (!pluginMetadata) return headers;

      const token = await pluginMetadata.getToken();
      if (token === null) return headers;

      headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  });
  return rawBaseQuery(args, WebApi, extraOptions);
};
