import {
  createEntityAdapter,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";
import { RootState } from "../../store";
import {
  AddNodeTypeDialogState,
  EdgeState,
  FlowRootState,
  FlowRunState,
  NodeDataState,
  NodeState,
  SaveFlowDialogState,
} from "./types";

const flowRunStatesAdapter = createEntityAdapter<FlowRunState>();
const nodesAdapter = createEntityAdapter<NodeState>();
const edgesAdapter = createEntityAdapter<EdgeState>();

const flowRunStatesInitialState = flowRunStatesAdapter.getInitialState();
const nodesInitialState = nodesAdapter.getInitialState();
const edgesInitialState = edgesAdapter.getInitialState();

const initialState: FlowRootState = {
  dataflowId: undefined,
  revisionId: undefined,
  addNodeTypeDialog: {
    visible: false,
    nodeType: null,
    selectedNodeId: null,
    selectedNodeClassifier: null,
  },

  saveFlowDialog: { visible: false, dataflowId: null },
  isTestMode: false,

  status: undefined,
  flowRunState: flowRunStatesInitialState,
  nodes: nodesInitialState,
  edges: edgesInitialState,
};

const flowSlice = createSlice({
  name: "flow",
  initialState,
  reducers: {
    setDataflowId: (state, action: PayloadAction<string>) => {
      state.dataflowId = action.payload;
    },
    setRevisionId: (state, action: PayloadAction<string>) => {
      state.revisionId = action.payload;
    },
    clearRevisionId: (state) => {
      state.revisionId = undefined;
    },
    setAddNodeTypeDialog: (
      state,
      action: PayloadAction<AddNodeTypeDialogState>
    ) => {
      state.addNodeTypeDialog = action.payload;
    },
    setSaveFlowDialog: (state, action: PayloadAction<SaveFlowDialogState>) => {
      state.saveFlowDialog = action.payload;
    },
    setIsTestMode: (state, action: PayloadAction<boolean>) => {
      state.isTestMode = action.payload;
    },

    // Flow status
    markStatusAsDraft: (state) => {
      state.status = "draft";
    },
    markStatusAsSaved: (state) => {
      state.status = "saved";
    },
    clearStatus: (state) => {
      state.status = undefined;
    },

    // Flow run state
    setFlowRunState: (state, action: PayloadAction<FlowRunState>) => {
      flowRunStatesAdapter.setAll(state.flowRunState, [action.payload]);
    },

    // Nodes
    replaceNodes: <TData extends NodeDataState>(
      state,
      action: PayloadAction<NodeState<TData>[]>
    ) => {
      nodesAdapter.setAll(state.nodes, action.payload);
    },
    setNode: <TData extends NodeDataState>(
      state,
      action: PayloadAction<NodeState<TData>>
    ) => {
      nodesAdapter.upsertOne(state.nodes, action.payload);
    },

    // Edges
    replaceEdges: (state, action: PayloadAction<EdgeState[]>) => {
      edgesAdapter.setAll(state.edges, action.payload);
    },
    setEdge: (state, action: PayloadAction<EdgeState>) => {
      edgesAdapter.upsertOne(state.edges, action.payload);
    },
  },
});

export const {
  setDataflowId,
  setRevisionId,
  clearRevisionId,
  setAddNodeTypeDialog,
  setSaveFlowDialog,
  setIsTestMode,

  // Flow status
  markStatusAsDraft,
  markStatusAsSaved,
  clearStatus,

  // Flow run state
  setFlowRunState,

  // Nodes
  replaceNodes,
  setNode,

  // Edges
  replaceEdges,
  setEdge,
} = flowSlice.actions;

export const { selectAll: selectNodes, selectById: selectNodeById } =
  nodesAdapter.getSelectors<RootState>((state) => state.flow.nodes);

export const { selectAll: selectEdges, selectById: selectEdgeById } =
  edgesAdapter.getSelectors<RootState>((state) => state.flow.edges);

export const flowReducers = {
  flow: flowSlice.reducer,
};
