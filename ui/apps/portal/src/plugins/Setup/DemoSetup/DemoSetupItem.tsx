import React, { FC, useCallback, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import { Button, CheckmarkIcon, CloseIcon } from "@portal/components";
import { useTranslation } from "../../../contexts";
import { api } from "../../../axios/api";
import { usePollingEffect } from "../../../hooks";
import { IProgressResponse, ISetupResponse } from "../../../types";
import { i18nKeys } from "../../../contexts/app-context/states";
import "./DemoSetupItem.scss";

const EMPTY_PROGRESS: IProgressResponse = {
  steps: [],
  status: "inprogress",
};

interface DemoStepItemProps {
  no: number;
  name: string;
  result?: ISetupResponse;
  onClick?: () => Promise<void>;
}

export const DemoSetupItem: FC<DemoStepItemProps> = ({ no, name, result, onClick }) => {
  const { getText } = useTranslation();
  const [progress, setProgress] = useState<IProgressResponse>(EMPTY_PROGRESS);
  const progressing = !!result?.id && progress?.status === "inprogress";
  const [loading, setLoading] = useState(false);

  const fetchProgress = useCallback(async () => {
    if (!result) return;

    const progress = await api.demo.getProgress(result.id);
    setProgress(progress);
  }, [result]);

  usePollingEffect(fetchProgress, [fetchProgress], {
    isEnabled: progressing,
    intervalSeconds: 2,
  });

  const handleClick = useCallback(async () => {
    try {
      setLoading(true);
      setProgress(EMPTY_PROGRESS);
      typeof onClick === "function" && (await onClick());
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="demo-setup-item">
      <div className="demo-setup-item__info">
        <div className="demo-setup-item__no">{no}.</div>
        <div className="demo-setup-item__title">
          <div>{name}</div>
          <div className="demo-setup-item__progress">
            {result?.message && (
              <div className="demo-setup-item__progress-step">
                <CheckmarkIcon />
                {result.message}
              </div>
            )}
            {progress?.steps?.map((step) => (
              <div key={step.step} className="demo-setup-item__progress-step">
                {step.status === "inprogress" ? (
                  <CircularProgress size={24} style={{ padding: 5 }} />
                ) : step.status === "failed" ? (
                  <CloseIcon />
                ) : (
                  <CheckmarkIcon />
                )}
                {step.message}
              </div>
            ))}
          </div>
        </div>
      </div>
      {onClick && (
        <div className="demo-setup-item__action">
          <Button text={getText(i18nKeys.DEMO_SETUP__RUN)} onClick={handleClick} loading={loading || progressing} />
        </div>
      )}
    </div>
  );
};
