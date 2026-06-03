import React, { FC, useEffect, useState, useCallback } from "react";

import { api } from "../../../../axios/api";
import { Loader } from "@portal/components";
import PieChart from "../../Common/PieChart";
import BoxPlotChart from "../../Common/BoxPlotChart";
import BarChart from "../../Common/BarChart";
import TreeMapChartTable from "../../Common/TreeMap/TreeMapChartTable";
import DrilldownTrellisChart from "../../Common/Drilldown/DrilldownTrellisChart/DrilldownTrellisChart";
import DrilldownPrevalenceByMonthChart from "../../Common/Drilldown/DrilldownPrevalenceByMonthChart/DrilldownPrevalenceByMonthChart";

import { parseDrilldownBarChartData, parsePieChartData, appendConceptName } from "../../util";

import { DRILLDOWN_REPORT_BASE_TYPE } from "../../../DQD/types";
import "./SharedDrilldown.scss";
import { useTranslation } from "../../../../contexts";

interface SharedDrilldownProps {
  flowRunId: string;
  sourceKey: string;
  datasetId: string;
  title?: string;
}

const SharedDrilldown: FC<SharedDrilldownProps> = ({ flowRunId, sourceKey, datasetId, title }) => {
  const { getText, i18nKeys } = useTranslation();
  const [data, setData] = useState({
    treemap: [],
  });
  const [isloadingData, setIsLoadingData] = useState(true);
  const [err, setErr] = useState("");

  const [selectedConcept, setSelectedConcept] = useState<{ id: string; name: string } | null>(null);
  const [leafConceptName, setLeafConceptName] = useState<string>("");
  const [drilldownData, setDrilldownData] = useState<DRILLDOWN_REPORT_BASE_TYPE>({});
  const [isloadingDrilldownData, setIsLoadingDrilldownData] = useState(false);
  const [errDrilldown, setErrDrilldown] = useState("");

  const getData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const result = await api.dataflow.getDataCharacterizationResults(flowRunId, sourceKey, datasetId);
      setData(result);
      setIsLoadingData(false);
      setErr("");
    } catch (error) {
      console.error(error);
      setIsLoadingData(false);
      setErr(getText(i18nKeys.SHARED_DRILLDOWN__ERROR_MESSAGE, [sourceKey]));
    }
  }, [flowRunId, sourceKey, getText, datasetId]);

  const getDrilldownData = useCallback(async () => {
    if (!selectedConcept) return;
    setIsLoadingDrilldownData(true);
    try {
      const result = await api.dataflow.getDataCharacterizationResultsDrilldown(
        flowRunId,
        sourceKey,
        selectedConcept.id,
        datasetId
      );
      setDrilldownData(result as DRILLDOWN_REPORT_BASE_TYPE);
      setIsLoadingDrilldownData(false);
      setErrDrilldown("");
    } catch (error) {
      console.error(error);
      setIsLoadingDrilldownData(false);
      setErrDrilldown(getText(i18nKeys.SHARED_DRILLDOWN__ERROR_MESSAGE, [sourceKey]));
    }
  }, [flowRunId, sourceKey, selectedConcept, getText, datasetId]);

  useEffect(() => {
    // Fetch data for charts
    getData();
  }, [getData]);

  useEffect(() => {
    // Fetch data for drilldown
    getDrilldownData();
  }, [getDrilldownData]);

  useEffect(() => {
    setLeafConceptName(
      selectedConcept?.name
        .split("||")
        .filter((s: string) => s.trim() !== "")
        .pop() || ""
    );
  }, [selectedConcept]);

  const renderDrilldownCharts = () => {
    // Render drilldown charts based on which data is available
    return (
      <>
        {drilldownData.prevalenceByGenderAgeYear && (
          <DrilldownTrellisChart
            data={drilldownData.prevalenceByGenderAgeYear}
            title={appendConceptName(title || sourceKey, leafConceptName)}
          />
        )}
        {drilldownData.prevalenceByMonth && (
          <DrilldownPrevalenceByMonthChart data={drilldownData.prevalenceByMonth} titleSuffix={leafConceptName} />
        )}
        <div className="chart__container">
          {drilldownData.byType && (
            <PieChart
              title={appendConceptName("Type", leafConceptName)}
              data={parsePieChartData(drilldownData.byType)}
            />
          )}
          {drilldownData.ageAtFirstOccurrence && (
            <BoxPlotChart
              data={drilldownData.ageAtFirstOccurrence}
              title={appendConceptName(getText(i18nKeys.SHARED_DRILLDOWN__BOX_PLOT_CHART_1_TITLE), leafConceptName)}
              xAxisName={getText(i18nKeys.SHARED_DRILLDOWN__BOX_PLOT_CHART_1_X_AXIS_NAME)}
              yAxisName={getText(i18nKeys.SHARED_DRILLDOWN__BOX_PLOT_CHART_1_Y_AXIS_NAME)}
            />
          )}
          {drilldownData.lengthOfEra && (
            <BoxPlotChart
              data={drilldownData.lengthOfEra}
              title={appendConceptName(getText(i18nKeys.SHARED_DRILLDOWN__BOX_PLOT_CHART_2_TITLE), leafConceptName)}
              xAxisName={getText(i18nKeys.SHARED_DRILLDOWN__BOX_PLOT_CHART_2_X_AXIS_NAME)}
              yAxisName={getText(i18nKeys.SHARED_DRILLDOWN__BOX_PLOT_CHART_2_Y_AXIS_NAME)}
            />
          )}
        </div>

        <div className="chart__container">
          {drilldownData.byValueAsConcept && (
            <PieChart
              title={appendConceptName(getText(i18nKeys.SHARED_DRILLDOWN__PIE_CHART_1_TITLE), leafConceptName)}
              data={parsePieChartData(drilldownData.byValueAsConcept)}
            />
          )}
          {drilldownData.byOperator && (
            <PieChart
              title={appendConceptName(getText(i18nKeys.SHARED_DRILLDOWN__PIE_CHART_2_TITLE), leafConceptName)}
              data={parsePieChartData(drilldownData.byOperator)}
            />
          )}
          {drilldownData.byQualifier && (
            <PieChart
              title={appendConceptName(getText(i18nKeys.SHARED_DRILLDOWN__PIE_CHART_3_TITLE), leafConceptName)}
              data={parsePieChartData(drilldownData.byQualifier)}
            />
          )}
        </div>

        <div className="chart__container">
          {drilldownData.measurementValueDistribution && (
            <PieChart
              title={appendConceptName(getText(i18nKeys.SHARED_DRILLDOWN__PIE_CHART_4_TITLE), leafConceptName)}
              data={parsePieChartData(drilldownData.measurementValueDistribution)}
            />
          )}
          {/* // TODO: Measurement value distribution */}
        </div>
        <div className="chart__container">
          {/* // TODO: Lower limit Distribution */}
          {/* // TODO: Upper Limit Distribution */}
          {/* // TODO: Values Relative to Normal Range */}
        </div>
        {drilldownData.frequencyDistribution && (
          <BarChart
            barChartData={parseDrilldownBarChartData(drilldownData.frequencyDistribution)}
            title={appendConceptName(getText(i18nKeys.SHARED_DRILLDOWN__BAR_CHART_TITLE), leafConceptName)}
            xAxisName={getText(i18nKeys.SHARED_DRILLDOWN__BAR_CHART_X_AXIS_NAME)}
            yAxisName={getText(i18nKeys.SHARED_DRILLDOWN__BAR_CHART_Y_AXIS_NAME)}
            tooltipFormat={getText(i18nKeys.SHARED_DRILLDOWN__BAR_CHART_TOOLTIP_FORMAT)}
          />
        )}
      </>
    );
  };

  return (
    <>
      {isloadingData ? (
        <Loader text={getText(i18nKeys.SHARED_DRILLDOWN__LOADER, [sourceKey])} />
      ) : err ? (
        <div className="info__section">{err}</div>
      ) : (
        <div className="treemap-chart-table__container">
          {isloadingDrilldownData && (
            <div className="drilldown-loader">
              <Loader text={getText(i18nKeys.SHARED_DRILLDOWN__LOADER, [sourceKey, selectedConcept?.id || ""])} />
            </div>
          )}
          <TreeMapChartTable
            title={title ?? sourceKey}
            data={data}
            setSelectedConcept={setSelectedConcept}
            loading={isloadingDrilldownData}
          />
        </div>
      )}

      {!selectedConcept?.id ? (
        <></>
      ) : isloadingDrilldownData ? (
        // Loader is shown inside treemap TreeMapChartTable itself as a "popup" instead of here
        <></>
      ) : errDrilldown ? (
        <div className="info__section">{errDrilldown}</div>
      ) : (
        renderDrilldownCharts()
      )}
    </>
  );
};

export default SharedDrilldown;
