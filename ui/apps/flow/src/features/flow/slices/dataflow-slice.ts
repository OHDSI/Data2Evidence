import { createApi } from "@reduxjs/toolkit/dist/query/react";
import {
  CreateFromTemplateDto,
  DataflowDto,
  DataflowItemDto,
  DeleteDataflowDto,
  DeleteDataflowResponseDto,
  DeleteDataflowRevisionDto,
  DeleteDataflowRevisionResponseDto,
  DuplicateDataflowDto,
  DuplicateDataflowResponseDto,
  FlowRunStateDto,
  LatestDataflowItemDto,
  NodeResultDto,
  OverwriteFromRemoteResponseDto,
  RemoteDiffCheckResponseDto,
  SaveDataflowDto,
  SaveDataflowResponseDto,
  TemplateDto,
  TestDataflowDto,
} from "../types";
import { createBaseQueryFn } from "./base-query";
import { ScanDataDBConnectionForm } from "~/features/flow/types/white-rabbit";

export const dataflowApiSlice = createApi({
  reducerPath: "dataflowApi",
  baseQuery: createBaseQueryFn("jobplugins/"),
  tagTypes: [
    "Dataflow",
    "DataflowRevision",
    "DataflowResult",
    "DataflowState",
    "Template",
  ],
  endpoints: (builder) => ({
    getDataflows: builder.query<DataflowDto[], void>({
      query: () => "dataflow/list",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Dataflow", id } as const)),
              { type: "Dataflow", id: "LIST" },
            ]
          : [{ type: "Dataflow", id: "LIST" }],
    }),
    getLatestDataflowById: builder.query<LatestDataflowItemDto, string>({
      query: (id) => `dataflow/${id}/latest`,
      providesTags: (result, error, id) => [
        { type: "Dataflow", id },
        { type: "Dataflow", id: "LIST" },
      ],
    }),
    // Get dataflow with all the revisions
    getDataflowById: builder.query<DataflowItemDto, string>({
      query: (id) => `dataflow/${id}`,
      providesTags: (result, error, id) => [{ type: "DataflowRevision", id }],
    }),
    getFlowRunResultsById: builder.query<NodeResultDto[], string>({
      query: (dataflowId) => {
        return `dataflow/${dataflowId}/flow-run-results`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ nodeName }) => ({
                type: "DataflowResult" as const,
                id: nodeName,
              })),
              { type: "DataflowResult", id: "LIST" },
            ]
          : [{ type: "DataflowResult", id: "LIST" }],
    }),
    saveDataflow: builder.mutation<SaveDataflowResponseDto, SaveDataflowDto>({
      query: (dataflow) => ({
        url: "dataflow",
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

        const messages = Array.isArray(message) ? message : [message];

        error.data.message = messages.map((msg) => {
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
        url: `dataflow/duplicate/${id}/${revisionId}`,
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
        url: `dataflow/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Dataflow", id }],
    }),
    deleteDataflowRevision: builder.mutation<
      DeleteDataflowRevisionResponseDto,
      DeleteDataflowRevisionDto
    >({
      query: ({ id, revisionId }) => ({
        url: `dataflow/${id}/${revisionId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "DataflowRevision", id },
      ],
    }),
    runDataflow: builder.mutation({
      query: (id) => ({
        url: `prefect/flow-run/${id}`,
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
    uploadNodeCsvFile: builder.mutation<
      { status: string },
      { nodeId: string; file: File }
    >({
      query: ({ nodeId, file }) => {
        const formData = new FormData();
        formData.append("file", file);

        return {
          url: `dataflow/file/csv?nodeId=${nodeId}`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: [{ type: "Dataflow", id: "LIST" }],
    }),
    deleteNodeCsvFile: builder.mutation<
      { status: string },
      { nodeId: string; fileName: string }
    >({
      query: ({ nodeId, fileName }) => ({
        url: `dataflow/file/csv?nodeId=${nodeId}&fileName=${fileName}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Dataflow", id: "LIST" }],
    }),
    checkRemoteDiff: builder.query<RemoteDiffCheckResponseDto, string>({
      query: (id) => `dataflow/${id}/remote-diff-check`,
      providesTags: (result, error, id) => [
        { type: "Dataflow", id },
        { type: "DataflowRevision", id },
      ],
    }),
    overwriteCanvasFromRemote: builder.mutation<
      OverwriteFromRemoteResponseDto,
      { id: string }
    >({
      query: ({ id }) => ({
        url: `dataflow/${id}/overwrite-from-remote`,
        method: "POST",
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Dataflow", id },
        { type: "DataflowRevision", id },
        { type: "Dataflow", id: "LIST" },
      ],
    }),
    getTemplates: builder.query<TemplateDto[], void>({
      query: () => "dataflow/templates",
      providesTags: ["Template"],
    }),
    createCanvasFromTemplate: builder.mutation<
      SaveDataflowResponseDto,
      CreateFromTemplateDto
    >({
      query: ({ templateId, name, comment }) => ({
        url: `dataflow/templates/${templateId}`,
        method: "POST",
        body: { name, comment },
      }),
      invalidatesTags: [{ type: "Dataflow", id: "LIST" }],
    }),
    createDBScanReport: builder.mutation<
      any,
      { postgresqlForm: ScanDataDBConnectionForm; tablesToScan: string[] }
    >({
      query: ({ postgresqlForm, tablesToScan }) => {
        const iniSettings = {
          ...postgresqlForm,
          server_location: `${postgresqlForm.server}:${postgresqlForm.port}/${postgresqlForm.database}`,
          tables_to_scan: tablesToScan.join(","),
          database: postgresqlForm.schema,
        };
        const data = {
          options: {
            data: iniSettings,
            run_type: "SCAN_REPORT_DB",
          },
        };
        return {
          url: "white-rabbit/flow-run",
          method: "POST",
          body: data,
        };
      },
    }),
    getFlowRunStatus: builder.query<
      {
        state_name: string;
        id: string;
      },
      string
    >({
      query: (flowRunId) => {
        return `white-rabbit/results/${flowRunId}`;
      },
    }),
    getSourceSchemaByFlowRunId: builder.query<any, string>({
      query: (flowRunId) => {
        return `perseus/artifacts/${flowRunId}`;
      },
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
  useUploadNodeCsvFileMutation,
  useDeleteNodeCsvFileMutation,
  useCheckRemoteDiffQuery,
  useOverwriteCanvasFromRemoteMutation,
  useGetTemplatesQuery,
  useCreateCanvasFromTemplateMutation,
  useCreateDBScanReportMutation,
  useLazyGetFlowRunStatusQuery,
  useLazyGetSourceSchemaByFlowRunIdQuery,
} = dataflowApiSlice;
