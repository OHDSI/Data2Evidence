import { EdgeState } from "./edge.state";
import { NodeState } from "./node.state";

export interface DataflowDto {
  id: string;
  name: string;
  createdBy: string;
  createdDate: string;
  modifiedBy: string;
  modifiedDate: string;
}

export interface DataflowItemDto {
  id: string;
  name: string;
  revisions: DataflowRevisionDto[];
}

export interface LatestDataflowItemDto {
  id: string;
  canvas: LatestDataflowDtoCanvas;
  flow: ReactFlowDto;
}

interface LatestDataflowDtoCanvas {
  id: string;
  name: string;
  lastFlowRunId: string | undefined;
}

export interface DataflowRevisionDto {
  id: string;
  createdBy: string;
  createdDate: string;
  flow: ReactFlowDto;
  comment: string;
  version: number;
}

export interface DataflowExportDto {
  id: string;
  name: string;
  createdBy: string;
  createdDate: string;
  flow: ReactFlowDto;
}

export interface SaveDataflowDto {
  id: string | undefined;
  name: string;
  dataflow: SaveDataflowRevisonDto;
}

export interface SaveDataflowRevisonDto extends ReactFlowDto {
  comment: string;
}

export interface SaveDataflowResponseDto {
  id: string;
  revisionId: string;
}

export interface DuplicateDataflowDto {
  id: string;
  revisionId: string;
  name: string;
}

export interface DuplicateDataflowResponseDto {
  id: string;
  revisionId: string;
}

export interface DeleteDataflowDto {
  id: string;
}

export interface DeleteDataflowResponseDto {
  id: string;
}

export interface DeleteDataflowRevisionDto {
  id: string;
  revisionId: string;
}

export interface DeleteDataflowRevisionResponseDto {
  revisionId: string;
}

export interface OverwriteFromRemoteResponseDto {
  message: string;
  overwritten: boolean;
  canvasId: string;
  revisionId?: string;
  previousVersion?: number;
  newVersion?: number;
  localVersion?: number;
}

export interface RemoteDiffCheckResponseDto {
  hasDifferences: boolean;
  reason: string;
  localVersion?: number;
}

export interface OverwriteAllFromRemoteResponseDto {
  message: string;
  processedCount: number;
  results: Array<{
    canvasId: string;
    revisionId?: string;
    name?: string;
    error?: string;
  }>;
}

interface ReactFlowDto {
  nodes: NodeState[];
  edges: EdgeState[];
}

export interface SaveFlowDialogState {
  visible: boolean;
  dataflowId: string | null;
}

export interface TestDataflowDto {
  dataflow: ReactFlowDto;
}

export type FlowStatus = "draft" | "saved";

export interface TemplateDto {
  id: string;
  name: string;
  description: string;
  nodes: NodeState[];
  edges: EdgeState[];
}

export interface CreateFromTemplateDto {
  templateId: string;
  name: string;
  comment?: string;
}
