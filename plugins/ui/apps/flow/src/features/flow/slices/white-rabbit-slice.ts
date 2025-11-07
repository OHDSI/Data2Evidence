import { createApi } from "@reduxjs/toolkit/dist/query/react";
import { createBaseQueryFn } from "./base-query";
import { ScanDataDBConnectionForm } from "~/features/flow/types/white-rabbit";
import { saveBlobAs } from "~/utils";

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
    getScanReport: builder.query<void, string>({
      async queryFn(id, _queryApi, _extraOptions, fetchWithBQ) {
        const response = await fetchWithBQ({
          url: `scan-report/result-as-resource/${id}`,
          method: "GET",
          responseHandler: (response: Response) => response.blob(),
        });
        if (response.error) {
          return { error: response.error };
        }
        saveBlobAs(response.data as Blob, "report.xlsx");
        return;
      },
      keepUnusedDataFor: 0,
    }),
  }),
});

export const { useTestDBConnectionMutation, useLazyGetScanReportQuery } =
  whiteRabbitApiSlice;
