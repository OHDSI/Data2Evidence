export interface FlowRunDto {
  id: string;
  name: string;
  createdBy: string;
  createdDate: string;
  modifiedBy: string;
  modifiedDate: string;
  results: NodeResultDto[];
}

export interface NodeResultDto {
  id: string;
  taskRunId: string;
  taskRunResult: {
    result: string;
  };
  error: boolean;
  errorMessage: string;
  nodeName: string;
  createdDate: string;
}

export interface FlowRunState {
  id: string;
  type: string;
  message: string;
  // Add the actual Prefect API response structure
  state_type: string;
  state: {
    type: string;
    name: string;
    message: string;
  };
}

export interface FlowRunStateDto extends FlowRunState {}
