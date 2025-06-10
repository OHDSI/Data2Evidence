import { Box, Button, IconButton } from "@portal/components";
import React, {
  CSSProperties,
  FC,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { useSelector } from "react-redux";
import { dispatch, RootState } from "../../../store";
import { replaceEdges, replaceNodes, setAddNodeTypeDialog } from "../reducers";
import { useGetDataflowsQuery, useGetLatestDataflowByIdQuery } from "../slices";
import { DeleteFlowButton } from "./Flow/DeleteFlow/DeleteFlowButton";
import { EmptyFlow } from "./Flow/EmptyFlow/EmptyFlow";
import { ExportFlowButton } from "./Flow/ExportFlow/ExportFlowButton";
import { FlowListSelect } from "./Flow/FlowList/FlowListSelect";
import { FlowPanel } from "./Flow/FlowPanel/FlowPanel";
import { FlowRevisionsButton } from "./Flow/FlowRevisions/FlowRevisionsButton";
import { ResultsPolling } from "./Flow/FlowRunResults/ResultsPolling";
import { FlowSettingsButton } from "./Flow/FlowSettings/FlowSettingsButton";
import { ImportFlowButton } from "./Flow/ImportFlow/ImportFlowButton";
import { SaveFlowButton } from "./Flow/SaveFlow/SaveFlowButton";
import { SaveNewFlowButton } from "./Flow/SaveFlow/SaveNewFlowButton";
import { SyncFromRemoteButton } from "./Flow/SyncFromRemote/SyncFromRemoteButton";
import { CreateGroupButton } from "./Node/NodeTypes/GroupNode/CreateGroupNodeButton";
import { selectFlowNodes } from "../selectors";
import "./FlowLayout.scss";

interface FlowLayoutProps {
  isStandalone: boolean;
}

export const FlowLayout: FC<FlowLayoutProps> = ({ isStandalone }) => {
  const dataflowId = useSelector((state: RootState) => state.flow.dataflowId);
  const { data: dataflows, isLoading } = useGetDataflowsQuery();
  const { data: dataflow, isFetching } = useGetLatestDataflowByIdQuery(
    dataflowId,
    {
      skip: !dataflowId,
    }
  );
  const revisionId = useSelector((state: RootState) => state.flow.revisionId);
  const nodes = useSelector(selectFlowNodes);

  const containerStyles: CSSProperties = useMemo(
    () =>
      isStandalone
        ? { width: "100vw", height: "100vh" }
        : { width: "100%", height: "100%" },
    [isStandalone]
  );

  useEffect(() => {
    if (!revisionId) {
      let savedNodes = [];
      let savedEdges = [];

      if (dataflow?.flow) {
        savedNodes = dataflow.flow.nodes;
        savedEdges = dataflow.flow.edges;
      }

      dispatch(replaceNodes(savedNodes));
      dispatch(replaceEdges(savedEdges));
    }
  }, [dataflow, revisionId]);

  const handleAddNode = useCallback(() => {
    dispatch(replaceNodes(nodes.map((node) => ({ ...node, selected: false }))));
    dispatch(setAddNodeTypeDialog({ visible: true }));
  }, [nodes]);

  if (!dataflows || isLoading) return null;

  if (dataflows && dataflows.length === 0 && !isLoading) {
    return (
      <div className="flow-layout flow-layout--empty" style={containerStyles}>
        <EmptyFlow />
      </div>
    );
  }

  return (
    <div className="flow-layout" style={containerStyles}>
      <div className="flow-layout__header">
        <Box flex="1" display="flex" gap={1} alignItems="center">
          <FlowListSelect />
          <Box display="flex" alignItems="center">
            <SaveNewFlowButton />
            <FlowRevisionsButton />
            <DeleteFlowButton />
            <ExportFlowButton />
            <ImportFlowButton />
            {isFetching && <IconButton loading />}
          </Box>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <SaveFlowButton />
          <Button variant="outlined" text="Add node" onClick={handleAddNode} />
          <CreateGroupButton />
          <SyncFromRemoteButton />
          <Box display="flex" alignItems="center">
            <FlowSettingsButton />
            <ResultsPolling />
          </Box>
        </Box>
      </div>
      <FlowPanel />
    </div>
  );
};
