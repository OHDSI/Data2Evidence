import React, { FC, useEffect, useState, useCallback } from "react";

import { api } from "../../../../axios/api";
import { Loader } from "@portal/components";
import PieChart from "../../Common/PieChart";
import BoxPlotChart from "../../Common/BoxPlotChart";
import BarChart from "../../Common/BarChart";
import TreeMapChartTable from "../../Common/TreeMap/TreeMapChartTable";
import DrilldownTrellisChart from "../../Common/Drilldown/DrilldownTrellisChart/DrilldownTrellisChart";
import DrilldownPrevalenceByMonthChart from "../../Common/Drilldown/DrilldownPrevalenceByMonthChart/DrilldownPrevalenceByMonthChart";

import { parseDrilldownPieChartData, parseDrilldownBarChartData } from "../../util";

import { DRILLDOWN_REPORT_BASE_TYPE } from "../../../DQD/types";
import "./SharedDrilldown.scss";
import { useTranslation } from "../../../../contexts";

interface SharedDrilldownProps {
  flowRunId: string;
  sourceKey: string;
  datasetId: string;
}

const SharedDrilldown: FC<SharedDrilldownProps> = ({ flowRunId, sourceKey, datasetId }) => {
  const { getText, i18nKeys } = useTranslation();
  const [data, setData] = useState({
    treemap: [],
  });
  const [isloadingData, setIsLoadingData] = useState(true);
  const [err, setErr] = useState("");

  const [selectedConceptId, setSelectedConceptId] = useState<string>("");
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
    if (selectedConceptId === "") return;
    setIsLoadingDrilldownData(true);
    try {
      const result = await api.dataflow.getDataCharacterizationResultsDrilldown(
        flowRunId,
        sourceKey,
        selectedConceptId,
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
  }, [flowRunId, sourceKey, selectedConceptId, getText, datasetId]);

  useEffect(() => {
    // Fetch data for charts
    getData();
  }, [getData]);

  useEffect(() => {
    // Fetch data for drilldown
    getDrilldownData();
  }, [getDrilldownData]);

  const renderDrilldownCharts = () => {
    // Render drilldown charts based on which data is available
    return (
      <>
        {drilldownData.prevalenceByGenderAgeYear && (
          <DrilldownTrellisChart data={drilldownData.prevalenceByGenderAgeYear} />
        )}
        {drilldownData.prevalenceByMonth && <DrilldownPrevalenceByMonthChart data={drilldownData.prevalenceByMonth} />}
        <div className="chart__container">
          {drilldownData.byType && <PieChart title="Type" data={parseDrilldownPieChartData(drilldownData.byType)} />}
          {drilldownData.ageAtFirstOccurrence && (
            <BoxPlotChart
              data={drilldownData.ageAtFirstOccurrence}
              title={getText(i18nKeys.SHARED_DRILLDOWN__BOX_PLOT_CHART_1_TITLE)}
              xAxisName={getText(i18nKeys.SHARED_DRILLDOWN__BOX_PLOT_CHART_1_X_AXIS_NAME)}
              yAxisName={getText(i18nKeys.SHARED_DRILLDOWN__BOX_PLOT_CHART_1_Y_AXIS_NAME)}
            />
          )}
          {drilldownData.lengthOfEra && (
            <BoxPlotChart
              data={drilldownData.lengthOfEra}
              title={getText(i18nKeys.SHARED_DRILLDOWN__BOX_PLOT_CHART_2_TITLE)}
              xAxisName={getText(i18nKeys.SHARED_DRILLDOWN__BOX_PLOT_CHART_2_X_AXIS_NAME)}
              yAxisName={getText(i18nKeys.SHARED_DRILLDOWN__BOX_PLOT_CHART_2_Y_AXIS_NAME)}
            />
          )}
        </div>

        <div className="chart__container">
          {drilldownData.byValueAsConcept && (
            <PieChart
              title={getText(i18nKeys.SHARED_DRILLDOWN__PIE_CHART_1_TITLE)}
              data={parseDrilldownPieChartData(drilldownData.byValueAsConcept)}
            />
          )}
          {drilldownData.byOperator && (
            <PieChart
              title={getText(i18nKeys.SHARED_DRILLDOWN__PIE_CHART_2_TITLE)}
              data={parseDrilldownPieChartData(drilldownData.byOperator)}
            />
          )}
          {drilldownData.byQualifier && (
            <PieChart
              title={getText(i18nKeys.SHARED_DRILLDOWN__PIE_CHART_3_TITLE)}
              data={parseDrilldownPieChartData(drilldownData.byQualifier)}
            />
          )}
        </div>

        <div className="chart__container">
          {drilldownData.measurementValueDistribution && (
            <PieChart
              title={getText(i18nKeys.SHARED_DRILLDOWN__PIE_CHART_4_TITLE)}
              data={parseDrilldownPieChartData(drilldownData.measurementValueDistribution)}
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
            title={getText(i18nKeys.SHARED_DRILLDOWN__BAR_CHART_TITLE)}
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
              <Loader text={getText(i18nKeys.SHARED_DRILLDOWN__LOADER, [sourceKey, selectedConceptId])} />
            </div>
          )}
          <TreeMapChartTable
            title={getText(i18nKeys.SHARED_DRILLDOWN__TREE_MAP_CHART_TITLE)}
            data={data.treemap}
            setSelectedConceptId={setSelectedConceptId}
          />
        </div>
      )}

      {selectedConceptId === "" ? (
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
