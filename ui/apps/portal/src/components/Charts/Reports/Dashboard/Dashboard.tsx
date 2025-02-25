import React, { FC, useEffect, useState, useCallback } from "react";

import { api } from "../../../../axios/api";
import { Loader } from "@portal/components";

import CDMSummary from "../../SourceKeys/Dashboard/CDMSummary/CDMSummary";
import PieChart from "../../Common/PieChart";
import BarChart from "../../Common/BarChart";

import ObservationPeriodCumulativeDurationChart from "../../SourceKeys/ObservationPeriod/ObservationPeriodCumulativeDurationChart/ObservationPeriodCumulativeDurationChart";
import ObservationPeriodObservedByMonthChart from "../../SourceKeys/ObservationPeriod/ObservationPeriodObservedByMonthChart/ObservationPeriodObservedByMonthChart";

import { parsePieChartData, parseBarChartData } from "../../util";

import { DASHBOARD_REPORT_TYPE, WEBAPI_CDMRESULTS_SOURCE_KEYS } from "../../../DQD/types";
import "./Dashboard.scss";
import { useTranslation } from "../../../../contexts";

interface DashboardProps {
  flowRunId: string;
  datasetId: string;
}

const Dashboard: FC<DashboardProps> = ({ flowRunId, datasetId }) => {
  const { getText, i18nKeys } = useTranslation();
  const [dashboardData, setDashboardData] = useState<DASHBOARD_REPORT_TYPE>({
    population: [],
    gender: [],
    ageAtFirst: [],
    cumulativeDuration: [],
    observedByMonth: [],
  });
  const [isloadingDashboardData, setIsLoadingDashboardData] = useState(true);
  const [errDashboard, setErrDashboard] = useState("");

  const getDashboardData = useCallback(async () => {
    setIsLoadingDashboardData(true);
    try {
      const result = await api.dataflow.getDataCharacterizationResults(
        flowRunId,
        WEBAPI_CDMRESULTS_SOURCE_KEYS.DASHBOARD,
        datasetId
      );
      setDashboardData(result as DASHBOARD_REPORT_TYPE);
      setIsLoadingDashboardData(false);
      setErrDashboard("");
    } catch (error) {
      console.error(error);
      setIsLoadingDashboardData(false);
      setErrDashboard(getText(i18nKeys.DASHBOARD__ERROR_MESSAGE));
    }
  }, [flowRunId, getText, datasetId]);

  useEffect(() => {
    // Fetch data for charts
    getDashboardData();
  }, [getDashboardData]);

  return (
    <>
      {isloadingDashboardData ? (
        <Loader text={getText(i18nKeys.DASHBOARD__LOADER)} />
      ) : errDashboard ? (
        <div className="info__section">{errDashboard}</div>
      ) : (
        <>
          <div className="summary__container">
            <CDMSummary data={dashboardData.population}></CDMSummary>
            <PieChart
              data={parsePieChartData(dashboardData.gender)}
              title={getText(i18nKeys.DASHBOARD__PIE_CHART_TITLE)}
            />
          </div>
          <BarChart
            barChartData={parseBarChartData(dashboardData.ageAtFirst)}
            title={getText(i18nKeys.DASHBOARD__BAR_CHART_TITLE)}
            xAxisName={getText(i18nKeys.DASHBOARD__BAR_CHART_X_AXIS_NAME)}
            yAxisName={getText(i18nKeys.DASHBOARD__BAR_CHART_Y_AXIS_NAME)}
            tooltipFormat={getText(i18nKeys.DASHBOARD__BAR_CHART_TOOLTIP_FORMAT)}
          />
          <ObservationPeriodCumulativeDurationChart data={dashboardData.cumulativeDuration} />
          <ObservationPeriodObservedByMonthChart data={dashboardData.observedByMonth} />
        </>
      )}
    </>
  );
};

export default Dashboard;
