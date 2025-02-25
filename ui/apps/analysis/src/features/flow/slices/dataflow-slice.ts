import { createApi } from "@reduxjs/toolkit/dist/query/react";
import {
  DataflowDto,
  LatestDataflowItemDto,
  DataflowItemDto,
  SaveDataflowDto,
  SaveDataflowResponseDto,
  DuplicateDataflowDto,
  DuplicateDataflowResponseDto,
  DeleteDataflowRevisionDto,
  DeleteDataflowRevisionResponseDto,
  TestDataflowDto,
  NodeResultDto,
  FlowRunStateDto,
  DeleteDataflowResponseDto,
  DeleteDataflowDto,
} from "../types";
import { baseQueryFn } from "./base-query";

export const dataflowApiSlice = createApi({
  reducerPath: "dataflowApi",
  baseQuery: baseQueryFn,
  tagTypes: ["Dataflow", "DataflowRevision", "DataflowResult", "DataflowState"],
  endpoints: (builder) => ({
    getDataflows: builder.query<DataflowDto[], void>({
      query: () => "analysisflow/list",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Dataflow", id } as const)),
              { type: "Dataflow", id: "LIST" },
            ]
          : [{ type: "Dataflow", id: "LIST" }],
    }),
    getLatestDataflowById: builder.query<LatestDataflowItemDto, string>({
      query: (id) => `analysisflow/${id}/latest`,
      providesTags: (result, error, id) => [
        { type: "Dataflow", id },
        { type: "Dataflow", id: "LIST" },
      ],
    }),
    // Get dataflow with all the revisions
    getDataflowById: builder.query<DataflowItemDto, string>({
      query: (id) => `analysisflow/${id}`,
      providesTags: (result, error, id) => [{ type: "DataflowRevision", id }],
    }),
    getFlowRunResultsById: builder.query<NodeResultDto[], string>({
      query: (dataflowId) => {
        return `analysisflow/${dataflowId}/flow-run-results`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "DataflowResult" as const,
                id,
              })),
              { type: "DataflowResult", id: "LIST" },
            ]
          : [{ type: "DataflowResult", id: "LIST" }],
    }),
    saveDataflow: builder.mutation<SaveDataflowResponseDto, SaveDataflowDto>({
      query: (dataflow) => ({
        url: "analysisflow",
        method: "POST",
        body: dataflow,
      }),
      transformErrorResponse: (error: {
        status: number;
        data: { message: string[] };
      }) => {
        const { message } = error.data;
        const nodeDataRegex = /^dataflow.nodes.([0-9]+).data./;
        const dataflowRegex = /^dataflow./;
        error.data.message = message.map((msg) => {
          if (nodeDataRegex.test(msg)) {
            return msg.replace(nodeDataRegex, "");
          } else if (dataflowRegex.test(msg)) {
            return msg.replace(dataflowRegex, "");
          }
          return msg;
        });
        return error;
      },
      invalidatesTags: (result, error, { id }) =>
        !id
          ? // create new flow
            [{ type: "Dataflow", id: "LIST" }]
          : // update existing flow
            [
              { type: "Dataflow", id },
              { type: "DataflowRevision", id },
            ],
    }),
    duplicateDataflow: builder.mutation<
      DuplicateDataflowResponseDto,
      DuplicateDataflowDto
    >({
      query: ({ id, revisionId, name }) => ({
        url: `analysisflow/duplicate/${id}/${revisionId}`,
        method: "POST",
        body: { name },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Dataflow", id: "LIST" },
      ],
    }),
    deleteDataflow: builder.mutation<
      DeleteDataflowResponseDto,
      DeleteDataflowDto
    >({
      query: ({ id }) => ({
        url: `analysisflow/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Dataflow", id }],
    }),
    deleteDataflowRevision: builder.mutation<
      DeleteDataflowRevisionResponseDto,
      DeleteDataflowRevisionDto
    >({
      query: ({ id, revisionId }) => ({
        url: `analysisflow/${id}/${revisionId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "DataflowRevision", id },
      ],
    }),
    runDataflow: builder.mutation({
      query: (id) => ({
        url: `prefect/analysis-run/${id}`,
        method: "POST",
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Dataflow", id },
        { type: "DataflowState", id: "LATEST" },
        { type: "DataflowResult", id: "LIST" },
      ],
    }),
    runTestDataflow: builder.mutation({
      query: (testFlow: TestDataflowDto) => ({
        url: `prefect/test-run`,
        method: "POST",
        body: testFlow,
      }),
    }),
    cancelFlowRun: builder.mutation({
      query: (flowRunId) => ({
        url: `prefect/flow-run/${flowRunId}/cancellation`,
        method: "POST",
      }),
    }),
    getFlowRunStateById: builder.query<FlowRunStateDto, string>({
      query: (flowRunId) => `prefect/flow-run/${flowRunId}/state`,
      providesTags: (result, error, id) => [
        { type: "DataflowState", id: "LATEST" },
      ],
    }),
  }),
});

export const {
  useGetDataflowsQuery,
  useGetDataflowByIdQuery, // Get dataflow with all the revisions
  useGetLatestDataflowByIdQuery,
  useSaveDataflowMutation,
  useDuplicateDataflowMutation,
  useDeleteDataflowMutation,
  useDeleteDataflowRevisionMutation,
  useRunDataflowMutation,
  useRunTestDataflowMutation,
  useCancelFlowRunMutation,
  useLazyGetFlowRunResultsByIdQuery,
  useLazyGetFlowRunStateByIdQuery,
} = dataflowApiSlice;
