import { createApi } from "@reduxjs/toolkit/dist/query/react";
import { createBaseQueryFn } from "./base-query";
import { WebApiCohortDefinitionResultDto } from "../types";

export const webapiSlice = createApi({
  reducerPath: "webapi",
  baseQuery: createBaseQueryFn("d2e-webapi/"),
  tagTypes: ["WebApi", "WebApiCohortDefinition"],
  endpoints: (builder) => ({
    getWebApiCohortDefinitions: builder.query<
      WebApiCohortDefinitionResultDto[],
      void
    >({
      query: () => "/cohortdefinition",
    }),
  }),
});

export const { useGetWebApiCohortDefinitionsQuery } = webapiSlice;
