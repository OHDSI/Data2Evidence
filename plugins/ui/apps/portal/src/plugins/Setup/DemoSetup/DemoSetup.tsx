import { Title } from "@portal/components";
import React, { FC, useCallback, useState } from "react";
import { api } from "../../../axios/api";
import { useTranslation } from "../../../contexts";
import env from "../../../env";
import { ISetupResponse } from "../../../types";
import "./DemoSetup.scss";
import { DemoSetupItem } from "./DemoSetupItem";

export const DemoSetup: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const [result, setResult] = useState<ISetupResponse>();
  const [phenotypeResult, setPhenotypeResult] = useState<ISetupResponse>();

  const handleSetup = useCallback(async () => {
    setResult(undefined);
    const result = await api.demo.setup(env.REACT_APP_DB_CREDENTIALS_PUBLIC_KEYS);
    setResult(result);
  }, []);

  const handlePhenotypeSetup = useCallback(async () => {
    setPhenotypeResult(undefined);
    const result = await api.demo.setupPhenotype();
    setPhenotypeResult(result);
  }, []);

  return (
    <div className="demo-setup">
      <div className="demo-setup__header">
        <Title>{getText(i18nKeys.DEMO_SETUP__SETUP_DEMO_TITLE)}</Title>
      </div>
      <div className="demo-setup__body">
        <div className="demo-setup__description">{getText(i18nKeys.DEMO_SETUP__DESCRIPTION)}</div>
        <DemoSetupItem
          name={getText(i18nKeys.DEMO_SETUP__SETUP_DEMO_DESCRIPTION)}
          result={result}
          onClick={handleSetup}
        />
        <DemoSetupItem
          name={getText(i18nKeys.DEMO_SETUP__SETUP_PHENOTYPE_DESCRIPTION)}
          result={phenotypeResult}
          onClick={handlePhenotypeSetup}
        />
      </div>
    </div>
  );
};
