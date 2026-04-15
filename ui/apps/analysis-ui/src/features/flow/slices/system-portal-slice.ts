import { createApi } from "@reduxjs/toolkit/dist/query/react";
import { createBaseQueryFn } from "./base-query";

export interface StudyDatasetDto {
  id: string;
  type: string;
  studyDetail?: { name: string };
}

export const systemPortalSlice = createApi({
  reducerPath: "systemPortalApi",
  baseQuery: createBaseQueryFn("system-portal/"),
  endpoints: (builder) => ({
    getStudyDatasets: builder.query<StudyDatasetDto[], void>({
      query: () => "dataset/list?role=researcher",
      transformResponse: (response: StudyDatasetDto[]) =>
        response.filter((d) => d.type === "strategus_analysis"),
    }),
  }),
});

export const { useGetStudyDatasetsQuery } = systemPortalSlice;
