import { createApi } from "@reduxjs/toolkit/dist/query/react";
import { createBaseQueryFn } from "./base-query";
import { ScanDataDBConnectionForm } from "~/features/flow/types/white-rabbit";

export const whiteRabbitApiSlice = createApi({
  reducerPath: "WhiteRabbitApi",
  baseQuery: createBaseQueryFn("white-rabbit/api/"),
  tagTypes: ["WhiteRabbitTestConnection"],
  endpoints: (builder) => ({
    testDBConnection: builder.mutation<
      any,
      { connectionDetail: ScanDataDBConnectionForm }
    >({
      query: ({ connectionDetail }) => ({
        url: "test-connection",
        method: "POST",
        body: connectionDetail,
      }),
    }),
  }),
});

export const { useTestDBConnectionMutation } = whiteRabbitApiSlice;
