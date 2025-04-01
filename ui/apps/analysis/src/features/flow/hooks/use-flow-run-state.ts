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
    flowRunState?.type && FLOW_RUN_STOPPED_STATES.includes(flowRunState.type);

  return { flowRunState, isStoppedState };
};
