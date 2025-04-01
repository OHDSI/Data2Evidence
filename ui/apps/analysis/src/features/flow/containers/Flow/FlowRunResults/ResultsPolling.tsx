import React, { FC, useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { IconButton, Tooltip } from "@portal/components";
import SyncIcon from "@mui/icons-material/Sync";
import {
  useGetLatestDataflowByIdQuery,
  useLazyGetFlowRunResultsByIdQuery,
} from "~/features/flow/slices";
import { RootState, dispatch } from "~/store";
import { processFlowRunResults } from "~/features/flow/actions";
import { NodeResultDto } from "~/features/flow/types";
import { useFlowRunState } from "~/features/flow/hooks";

export const ResultsPolling: FC = () => {
  const dataflowId = useSelector((state: RootState) => state.flow.dataflowId);
  const [getFlowRunResultsById, { isFetching }] =
    useLazyGetFlowRunResultsByIdQuery();

  const { data: dataflow } = useGetLatestDataflowByIdQuery(dataflowId, {
    skip: !dataflowId,
  });
  const { isStoppedState } = useFlowRunState(dataflow?.lastFlowRunId || "");
  const [_, setIsCompleted] = useState(isStoppedState);

  useEffect(() => {
    setIsCompleted((isCompleted) => {
      // transition from running to completed, trigger flow run result
      if (!isCompleted && isStoppedState) {
        fetchFlowRunResults();
      }
      return isStoppedState;
    });
  }, [isStoppedState]);

  const fetchFlowRunResults = useCallback(async () => {
    if (!dataflowId) return;

    try {
      const payload = await getFlowRunResultsById(dataflowId).unwrap();
      if (payload.length) {
        dispatch(processFlowRunResults(payload as NodeResultDto[]));
      }
    } catch (error) {
      console.error("Error when polling dataflow result", error);
    }
  }, [dataflowId]);

  return (
    <Tooltip title="Refresh flow run results">
      <div>
        <IconButton
          startIcon={<SyncIcon sx={{ width: 24, height: 24 }} />}
          loading={isFetching}
          onClick={fetchFlowRunResults}
        />
      </div>
    </Tooltip>
  );
};
