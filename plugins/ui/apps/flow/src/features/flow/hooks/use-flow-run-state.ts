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

  const isStoppedState =
    flowRunState?.state_type &&
    FLOW_RUN_STOPPED_STATES.includes(flowRunState.state_type);

  return { flowRunState, isStoppedState };
};
