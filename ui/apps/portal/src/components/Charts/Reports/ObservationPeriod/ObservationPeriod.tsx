import React, { FC, useEffect, useState, useCallback } from "react";

import { api } from "../../../../axios/api";
import { Loader } from "@portal/components";

import PieChart from "../../Common/PieChart";
import BoxPlotChart from "../../Common/BoxPlotChart";
import BarChart from "../../Common/BarChart";
import ObservationPeriodCumulativeDurationChart from "../../SourceKeys/ObservationPeriod/ObservationPeriodCumulativeDurationChart/ObservationPeriodCumulativeDurationChart";
import ObservationPeriodObservedByMonthChart from "../../SourceKeys/ObservationPeriod/ObservationPeriodObservedByMonthChart/ObservationPeriodObservedByMonthChart";

import { parsePieChartData, parseDaysToYears, parseBarChartData } from "../../util";

import { OBSERVATIONPERIOD_REPORT_TYPE, WEBAPI_CDMRESULTS_SOURCE_KEYS } from "../../../DQD/types";
import "./ObservationPeriod.scss";
import { useTranslation } from "../../../../contexts";

interface ObservationPeriodProps {
  flowRunId: string;
  datasetId: string;
}

const ObservationPeriod: FC<ObservationPeriodProps> = ({ flowRunId, datasetId }) => {
  const { getText, i18nKeys } = useTranslation();
  const [observationPeriodData, setObservationPeriodData] = useState<OBSERVATIONPERIOD_REPORT_TYPE>({
    ageAtFirst: [],
    ageByGender: [],
    cumulativeObservation: [],
    observationLength: [],
    observationLengthStats: [],
    durationByAgeDecile: [],
    durationByGender: [],
    observedByMonth: [],
    personsWithContinuousObservationsByYear: [],
    personsWithContinuousObservationsByYearStats: [],
    observationPeriodsPerPerson: [],
  });
  const [isloadingObservationPeriodData, setIsLoadingObservationPeriodData] = useState(true);
  const [errObservationPeriod, setErrObservationPeriod] = useState("");

  const getObservationPeriodData = useCallback(async () => {
    setIsLoadingObservationPeriodData(true);
    try {
      const result = await api.dataflow.getDataCharacterizationResults(
        flowRunId,
        WEBAPI_CDMRESULTS_SOURCE_KEYS.OBSERVATIONPERIOD,
        datasetId
      );
      setObservationPeriodData(result as OBSERVATIONPERIOD_REPORT_TYPE);
      setIsLoadingObservationPeriodData(false);
      setErrObservationPeriod("");
    } catch (error) {
      console.error(error);
      setIsLoadingObservationPeriodData(false);
      setErrObservationPeriod(getText(i18nKeys.OBSERVATION_PERIOD__ERROR_MESSAGE));
    }
  }, [flowRunId, getText, datasetId]);

  useEffect(() => {
    // Fetch data for charts
    getObservationPeriodData();
  }, [getObservationPeriodData]);

  return (
    <>
      {isloadingObservationPeriodData ? (
        <Loader text={getText(i18nKeys.OBSERVATION_PERIOD__LOADER)} />
      ) : errObservationPeriod ? (
        <div className="info__section">{errObservationPeriod}</div>
      ) : (
        <>
          <div className="imbalanced__container">
            <BarChart
              barChartData={parseBarChartData(observationPeriodData.ageAtFirst)}
              title={getText(i18nKeys.OBSERVATION_PERIOD__BAR_CHART_1_TITLE)}
              xAxisName={getText(i18nKeys.OBSERVATION_PERIOD__BAR_CHART_1_X_AXIS_NAME)}
              yAxisName={getText(i18nKeys.OBSERVATION_PERIOD__BAR_CHART_1_Y_AXIS_NAME)}
              tooltipFormat={getText(i18nKeys.OBSERVATION_PERIOD__BAR_CHART_1_TOOLTIP_FORMAT)}
              axisBaseGap={12}
            />
            <BoxPlotChart
              data={observationPeriodData.ageByGender}
              title={getText(i18nKeys.OBSERVATION_PERIOD__BOX_PLOT_CHART_1_TITLE)}
              xAxisName={getText(i18nKeys.OBSERVATION_PERIOD__BOX_PLOT_CHART_1_X_AXIS_NAME)}
              yAxisName={getText(i18nKeys.OBSERVATION_PERIOD__BOX_PLOT_CHART_1_Y_AXIS_NAME)}
              axisBaseGap={12}
            />
          </div>
          <div className="imbalanced__container">
            <BarChart
              barChartData={parseBarChartData(
                observationPeriodData.observationLength,
                observationPeriodData.observationLengthStats[0].MINVALUE,
                true
              )}
              title={getText(i18nKeys.OBSERVATION_PERIOD__BAR_CHART_2_TITLE)}
              xAxisName={getText(i18nKeys.OBSERVATION_PERIOD__BAR_CHART_2_X_AXIS_NAME)}
              yAxisName={getText(i18nKeys.OBSERVATION_PERIOD__BAR_CHART_2_Y_AXIS_NAME)}
              tooltipFormat={getText(i18nKeys.OBSERVATION_PERIOD__BAR_CHART_2_TOOLTIP_FORMAT)}
              axisBaseGap={12}
            />
            <BoxPlotChart
              data={parseDaysToYears(observationPeriodData.durationByGender)}
              title={getText(i18nKeys.OBSERVATION_PERIOD__BOX_PLOT_CHART_2_TITLE)}
              xAxisName={getText(i18nKeys.OBSERVATION_PERIOD__BOX_PLOT_CHART_2_X_AXIS_NAME)}
              yAxisName={getText(i18nKeys.OBSERVATION_PERIOD__BOX_PLOT_CHART_2_Y_AXIS_NAME)}
              axisBaseGap={10}
            />
          </div>
          <div className="chart__container">
            <ObservationPeriodCumulativeDurationChart
              data={observationPeriodData.cumulativeObservation}
              axisBaseGap={36}
            />
            <BoxPlotChart
              data={parseDaysToYears(observationPeriodData.durationByAgeDecile)}
              title={getText(i18nKeys.OBSERVATION_PERIOD__BOX_PLOT_CHART_3_TITLE)}
              xAxisName={getText(i18nKeys.OBSERVATION_PERIOD__BOX_PLOT_CHART_3_X_AXIS_NAME)}
              yAxisName={getText(i18nKeys.OBSERVATION_PERIOD__BOX_PLOT_CHART_3_Y_AXIS_NAME)}
              axisBaseGap={12}
            />
          </div>
          <div className="imbalanced__container">
            <BarChart
              barChartData={parseBarChartData(
                observationPeriodData.personsWithContinuousObservationsByYear,
                observationPeriodData.personsWithContinuousObservationsByYearStats[0].MINVALUE
              )}
              title={getText(i18nKeys.OBSERVATION_PERIOD__BAR_CHART_3_TITLE)}
              xAxisName={getText(i18nKeys.OBSERVATION_PERIOD__BAR_CHART_3_X_AXIS_NAME)}
              yAxisName={getText(i18nKeys.OBSERVATION_PERIOD__BAR_CHART_3_Y_AXIS_NAME)}
              tooltipFormat={getText(i18nKeys.OBSERVATION_PERIOD__BAR_CHART_3_TOOLTIP_FORMAT)}
            />
            <PieChart
              data={parsePieChartData(observationPeriodData.observationPeriodsPerPerson)}
              title={getText(i18nKeys.OBSERVATION_PERIOD__PIE_CHART_TITLE)}
            />
          </div>
          <ObservationPeriodObservedByMonthChart data={observationPeriodData.observedByMonth} />
        </>
      )}
    </>
  );
};

export default ObservationPeriod;
