import React, { FC } from "react";

import ChartContainer from "../../ChartContainer";
import LineChart from "../../LineChart";

import "./DrilldownPrevalenceByMonthChart.scss";
import { useTranslation } from "../../../../../contexts";

interface DrilldownPrevalenceByMonthChartProps {
  data: any;
}

const DrilldownPrevalenceByMonthChart: FC<DrilldownPrevalenceByMonthChartProps> = ({ data }) => {
  const { getText, i18nKeys } = useTranslation();
  const title = getText(i18nKeys.DRILLDOWN_PREVALENCE_BY_MONTH_CHART__TITLE);
  const xAxisName = getText(i18nKeys.DRILLDOWN_PREVALENCE_BY_MONTH_CHART__Y_AXIS_NAME);
  const yAxisName = getText(i18nKeys.DRILLDOWN_PREVALENCE_BY_MONTH_CHART__Y_AXIS_NAME);
  const tooltipFormat = getText(i18nKeys.DRILLDOWN_PREVALENCE_BY_MONTH_CHART__TOOLTIP_FORMAT);
  const yAxisFormat = getText(i18nKeys.DRILLDOWN_PREVALENCE_BY_MONTH_CHART__Y_AXIS_NAME);

  if (data.length === 0) {
    return (
      <ChartContainer title={title}>
        <div className="no_data_text">{getText(i18nKeys.DRILLDOWN_PREVALENCE_BY_MONTH_CHART__NO_DATA)}</div>
      </ChartContainer>
    );
  }

  // Parse and format line chart data
  // Parse X_CALENDAR_MONTH from e.g 200910 -> 10/2009
  const lineChartXAxisData = data.map(
    (obj: any) => obj["X_CALENDAR_MONTH"].toString().slice(-2) + "/" + obj["X_CALENDAR_MONTH"].toString().slice(0, 4)
  );

  const series = [
    {
      type: "line",
      data: data.map((obj: any) => Number(obj["Y_PREVALENCE_1000_PP"]).toFixed()),
    },
  ];

  return (
    <div>
      <LineChart
        lineChartXAxisData={lineChartXAxisData}
        series={series}
        title={title}
        xAxisName={xAxisName}
        yAxisName={yAxisName}
        lineChartFormatConfig={{ tooltipFormat, yAxisFormat }}
      />
    </div>
  );
};

export default DrilldownPrevalenceByMonthChart;
