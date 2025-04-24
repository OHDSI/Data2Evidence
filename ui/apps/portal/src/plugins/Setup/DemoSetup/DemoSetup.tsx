import React, { FC, useCallback, useState } from "react";
import { Title } from "@portal/components";
import { useTranslation } from "../../../contexts";
import { api } from "../../../axios/api";
import { ISetupResponse } from "../../../types";
import { DemoSetupItem } from "./DemoSetupItem";
import env from "../../../env";
import "./DemoSetup.scss";

export const DemoSetup: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const [dbResult, setDbResult] = useState<ISetupResponse>();
  const [datasetResult, setDatasetResult] = useState<ISetupResponse>();

  const handleSetupDb = useCallback(async () => {
    setDbResult(undefined);
    const result = await api.demo.setupDb(env.REACT_APP_DB_CREDENTIALS_PUBLIC_KEYS);
    setDbResult(result);
  }, []);

  const handleSetupDataset = useCallback(async () => {
    setDatasetResult(undefined);
    const result = await api.demo.setupDataset();
    setDatasetResult(result);
  }, []);

  return (
    <div className="demo-setup">
      <div className="demo-setup__header">
        <Title>{getText(i18nKeys.DEMO_SETUP__SETUP_DEMO_TITLE)}</Title>
      </div>
      <div className="demo-setup__body">
        <div className="demo-setup__description">{getText(i18nKeys.DEMO_SETUP__DESCRIPTION)}</div>
        <DemoSetupItem
          no={1}
          name={getText(i18nKeys.DEMO_SETUP__SETUP_DEMO_DB)}
          result={dbResult}
          onClick={handleSetupDb}
        />
        <DemoSetupItem no={2} name={getText(i18nKeys.DEMO_SETUP__RESTART)} />
        <DemoSetupItem
          no={3}
          name={getText(i18nKeys.DEMO_SETUP__SETUP_DEMO_DATASET)}
          result={datasetResult}
          onClick={handleSetupDataset}
        />
      </div>
    </div>
  );
};
