import { useSelector } from "react-redux";
import { RootState } from "~/store";

export const FLOW_RUN_STOPPED_STATES = [
  "CANCELLED",
  "COMPLETED",
  "FAILED",
  "CRASHED",
];

export const useFlowRunState = (flowRunId: string) => {
  const flowRunState = useSelector(
    (state: RootState) => state.flow.flowRunState.entities[flowRunId]
  );

  // Check both the old format and the new Prefect format
  const flowType =
    flowRunState?.type || flowRunState?.state_type || flowRunState?.state?.type;

  const isStoppedState = flowType && FLOW_RUN_STOPPED_STATES.includes(flowType);

  return { flowRunState, isStoppedState };
};
