import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import ReplayIcon from "@mui/icons-material/Replay";
import { Box, IconButton, Tooltip } from "@portal/components";
import classNames from "classnames";
import React, { FC, useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useFlowRunState, usePollingEffect } from "~/features/flow/hooks";
import {
  selectEdges,
  setFlowRunState,
  setSaveFlowDialog,
} from "~/features/flow/reducers";
import { selectFlowNodes } from "~/features/flow/selectors";
import {
  useCancelFlowRunMutation,
  useGetLatestDataflowByIdQuery,
  useLazyGetFlowRunStateByIdQuery,
  useRunDataflowMutation,
  useRunTestDataflowMutation,
} from "~/features/flow/slices";
import { FlowRunState } from "~/features/flow/types";
import { pluginMetadata } from "~/FlowApp";
import { RootState, dispatch } from "~/store";

export const RunFlowButton: FC = () => {
  const dataflowId = useSelector((state: RootState) => state.flow.dataflowId);
  const isNew = dataflowId == null;
  const isTestMode = useSelector((state: RootState) => state.flow.isTestMode);
  const uploadResults = useSelector(
    (state: RootState) => state.flow.uploadResults
  );

  const status = useSelector((state: RootState) => state.flow.status);
  const [runAfterSaved, setRunAfterSaved] = useState(false);

  const nodes = useSelector(selectFlowNodes);
  const edges = useSelector(selectEdges);
  const { data: dataflow } = useGetLatestDataflowByIdQuery(dataflowId, {
    skip: !dataflowId,
  });

  const flowRunId = dataflow?.lastFlowRunId || "";
  const { flowRunState, isStoppedState } = useFlowRunState(flowRunId);

  const [runDataflow, { isLoading: isRunning }] = useRunDataflowMutation();
  const [runTestDataflow, { isLoading: testFlowLoading }] =
    useRunTestDataflowMutation();
  const [cancelFlowRun, { isLoading: isCancelling }] =
    useCancelFlowRunMutation();

  const [getFlowRunStateById, { isFetching: isFetchingFlowRunState }] =
    useLazyGetFlowRunStateByIdQuery();

  const isFlowRunError =
    !isRunning &&
    !isFetchingFlowRunState &&
    ["FAILED", "CRASHED"].includes(
      flowRunState?.type ||
        flowRunState?.state_type ||
        flowRunState?.state?.type
    );

  const isWaitingForResult = flowRunState?.id && !isStoppedState;
  const classes = classNames("run-flow-button", {
    "run-flow-button--running": isWaitingForResult,
  });

  // Helper function to get the error message from the flow run state
  const getErrorMessage = () => {
    return (
      flowRunState?.message ||
      flowRunState?.state?.message ||
      "Unknown error occurred"
    );
  };

  const fetchFlowRunState = useCallback(async () => {
    if (!flowRunId) return;

    try {
      const payload = await getFlowRunStateById(flowRunId).unwrap();
      if (payload) {
        dispatch(setFlowRunState(payload as FlowRunState));
      }
    } catch (error) {
      console.error("Error when polling dataflow result", error);
    }
  }, [flowRunId]);

  const runFlow = useCallback(async () => {
    if (isTestMode) {
      const body = { uploadResults, dataflow: { nodes, edges } };
      await runTestDataflow(body);
    } else {
      const datasetId = pluginMetadata?.studyId;
      if (!datasetId) {
        console.error("No datasetId available from plugin metadata");
        return;
      }
      await runDataflow({ id: dataflowId, datasetId, uploadResults });
    }
  }, [dataflowId, isTestMode, nodes, edges, uploadResults]);

  const handleRun = useCallback(async () => {
    if (status === "draft") {
      dispatch(setSaveFlowDialog({ visible: true, dataflowId }));
      setRunAfterSaved(true);
    } else {
      await runFlow();
    }
  }, [dataflowId, runFlow]);

  const handleCancel = useCallback(async () => {
    await cancelFlowRun(flowRunId);
    fetchFlowRunState();
  }, [flowRunId]);

  useEffect(() => {
    if (runAfterSaved && status === "saved") {
      setRunAfterSaved(false);
      runFlow();
    }
  }, [runAfterSaved, status]);

  usePollingEffect(fetchFlowRunState, [fetchFlowRunState], {
    isEnabled: !isStoppedState || isCancelling,
  });

  if (isNew && !isTestMode) return;

  return (
    <Box display="flex" flexDirection="column" alignItems="flex-end">
      <Tooltip
        title={
          isWaitingForResult
            ? "Running"
            : isFlowRunError
            ? getErrorMessage()
            : "Run flow"
        }
      >
        <div>
          <IconButton
            className={classes}
            startIcon={<PlayCircleOutlineIcon sx={{ width: 28, height: 30 }} />}
            onClick={handleRun}
            color={isFlowRunError ? "error" : "primary"}
            loading={
              isRunning ||
              testFlowLoading ||
              isFetchingFlowRunState ||
              isWaitingForResult
            }
          />
        </div>
      </Tooltip>
      {isWaitingForResult && (
        <Tooltip title="Cancel run">
          <div>
            <IconButton
              startIcon={<ReplayIcon sx={{ width: 28, height: 30 }} />}
              onClick={handleCancel}
              loading={isCancelling}
            />
          </div>
        </Tooltip>
      )}
    </Box>
  );
};
