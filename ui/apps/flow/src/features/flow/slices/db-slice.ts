import { createApi } from "@reduxjs/toolkit/dist/query/react";
import { createBaseQueryFn } from "./base-query";

export interface Database {
  id: string;
  code: string;
  name: string;
  dialect: string;
}

export const dbApiSlice = createApi({
  reducerPath: "dbApi",
  baseQuery: createBaseQueryFn("trex/"),
  endpoints: (builder) => ({
    getDatabases: builder.query<Database[], void>({
      query: () => "db/",
    }),
  }),
});

export const { useGetDatabasesQuery } = dbApiSlice;
