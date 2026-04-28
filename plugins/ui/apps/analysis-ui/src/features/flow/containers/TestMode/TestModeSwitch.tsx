import React, { FC, useCallback } from "react";
import { useSelector } from "react-redux";
import { Switch } from "@portal/components";
import { RootState, dispatch } from "~/store";
import { setIsTestMode } from "~/features/flow/reducers";

export const TestModeSwitch: FC = () => {
  const isTestMode = useSelector((state: RootState) => state.flow.isTestMode);
  const handleSwitch = useCallback(async () => {
    dispatch(setIsTestMode(!isTestMode));
  }, []);

  return (
    <>
      <Switch title="Trace mode" checked={isTestMode} onClick={handleSwitch} />
    </>
  );
};
