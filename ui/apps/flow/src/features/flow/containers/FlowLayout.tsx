import React, {
  CSSProperties,
  FC,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { useSelector } from "react-redux";
import { Box, Button } from "@portal/components";
import { replaceEdges, replaceNodes, setAddNodeTypeDialog } from "../reducers";
import { dispatch, RootState } from "../../../store";
import { useGetDataflowsQuery, useGetLatestDataflowByIdQuery } from "../slices";
import { FlowSettingsButton } from "./Flow/FlowSettings/FlowSettingsButton";
import { SaveFlowButton } from "./Flow/SaveFlow/SaveFlowButton";
import { SaveNewFlowButton } from "./Flow/SaveFlow/SaveNewFlowButton";
import { FlowListSelect } from "./Flow/FlowList/FlowListSelect";
import { FlowPanel } from "./Flow/FlowPanel/FlowPanel";
import { FlowRevisionsButton } from "./Flow/FlowRevisions/FlowRevisionsButton";
import { EmptyFlow } from "./Flow/EmptyFlow/EmptyFlow";
import { ResultsPolling } from "./Flow/FlowRunResults/ResultsPolling";
import { DeleteFlowButton } from "./Flow/DeleteFlow/DeleteFlowButton";
import { CreateGroupButton } from "./Node/NodeTypes/GroupNode/CreateGroupNodeButton";
import "./FlowLayout.scss";
import { ExportFlowButton } from "./Flow/ExportFlow/ExportFlowButton";

interface FlowLayoutProps {
  isStandalone: boolean;
}

export const FlowLayout: FC<FlowLayoutProps> = ({ isStandalone }) => {
  const dataflowId = useSelector((state: RootState) => state.flow.dataflowId);
  const { data: dataflows, isLoading } = useGetDataflowsQuery();
  const { data: dataflow } = useGetLatestDataflowByIdQuery(dataflowId, {
    skip: !dataflowId,
  });
  const revisionId = useSelector((state: RootState) => state.flow.revisionId);

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
    dispatch(setAddNodeTypeDialog({ visible: true }));
  }, []);

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
          </Box>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <SaveFlowButton />
          <Button variant="outlined" text="Add node" onClick={handleAddNode} />
          <CreateGroupButton />
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
