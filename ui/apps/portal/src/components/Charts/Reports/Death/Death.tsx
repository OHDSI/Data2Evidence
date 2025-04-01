import React, { FC, useEffect, useState, useCallback } from "react";

import { api } from "../../../../axios/api";
import { Loader } from "@portal/components";

import PieChart from "../../Common/PieChart";
import BoxPlotChart from "../../Common/BoxPlotChart";
import DrilldownTrellisChart from "../../Common/Drilldown/DrilldownTrellisChart/DrilldownTrellisChart";
import DeathPrevalenceByMonthChart from "../../SourceKeys/Death/DeathPrevalenceByMonthChart/DeathPrevalenceByMonthChart";

import { parsePieChartData } from "../../util";

import { DEATH_REPORT_TYPE, WEBAPI_CDMRESULTS_SOURCE_KEYS } from "../../../DQD/types";
import "./Death.scss";
import { useTranslation } from "../../../../contexts";

interface DeathProps {
  flowRunId: string;
  datasetId: string;
}

const Death: FC<DeathProps> = ({ flowRunId, datasetId }) => {
  const { getText, i18nKeys } = useTranslation();
  const [deathData, setDeathData] = useState<DEATH_REPORT_TYPE>({
    ageAtDeath: [],
    deathByType: [],
    prevalenceByGenderAgeYear: [],
    prevalenceByMonth: [],
  });
  const [isloadingDeathData, setIsLoadingDeathData] = useState(true);
  const [errDeath, setErrDeath] = useState("");

  const getDeathData = useCallback(async () => {
    setIsLoadingDeathData(true);
    try {
      const result = await api.dataflow.getDataCharacterizationResults(
        flowRunId,
        WEBAPI_CDMRESULTS_SOURCE_KEYS.DEATH,
        datasetId
      );
      setDeathData(result as DEATH_REPORT_TYPE);
      setIsLoadingDeathData(false);
      setErrDeath("");
    } catch (error) {
      console.error(error);
      setIsLoadingDeathData(false);
      setErrDeath(getText(i18nKeys.DEATH__ERROR_MESSAGE));
    }
  }, [flowRunId, getText, datasetId]);

  useEffect(() => {
    // Fetch data for charts
    getDeathData();
  }, [getDeathData]);

  return (
    <>
      {isloadingDeathData ? (
        <Loader text={getText(i18nKeys.DEATH__LOADER)} />
      ) : errDeath ? (
        <div className="info__section">{errDeath}</div>
      ) : (
        <>
          <DrilldownTrellisChart data={deathData.prevalenceByGenderAgeYear} trellisXAxisKey="Y_PREVALENCE_1000PP" />
          <DeathPrevalenceByMonthChart data={deathData.prevalenceByMonth} />
          <div className="chart__container">
            <PieChart
              data={parsePieChartData(deathData.deathByType)}
              title={getText(i18nKeys.DEATH__PIE_CHART_TITLE)}
            />
            <BoxPlotChart
              data={deathData.ageAtDeath}
              title={getText(i18nKeys.DEATH__BOX_PLOT_CHART_TITLE)}
              xAxisName={getText(i18nKeys.DEATH__BOX_PLOT_CHART_X_AXIS_NAME)}
              yAxisName={getText(i18nKeys.DEATH__ERROR_MESSAGE)}
            />
          </div>
        </>
      )}
    </>
  );
};

export default Death;
