import React, { FC } from "react";

import LineChart from "../../../Common/LineChart";
import ChartContainer from "../../../Common/ChartContainer";

import "./ObservationPeriodObservedByMonthChart.scss";
import { useTranslation } from "../../../../../contexts";

interface ObservationPeriodObservedByMonthChartProps {
  data: any;
}

const ObservationPeriodObservedByMonthChart: FC<ObservationPeriodObservedByMonthChartProps> = ({ data }) => {
  const { getText, i18nKeys } = useTranslation();
  const title = getText(i18nKeys.OBSERVATION_PERIOD_OBSERVED_BY_MONTH_CHART__TITLE);
  const xAxisName = getText(i18nKeys.OBSERVATION_PERIOD_OBSERVED_BY_MONTH_CHART__X_AXIS_NAME);
  const yAxisName = getText(i18nKeys.OBSERVATION_PERIOD_OBSERVED_BY_MONTH_CHART__Y_AXIS_NAME);
  const tooltipFormat = getText(i18nKeys.OBSERVATION_PERIOD_OBSERVED_BY_MONTH_CHART__TOOLTIP_FORMAT);

  if (data.length === 0) {
    return (
      <ChartContainer title={title}>
        <div className="no_data_text">{getText(i18nKeys.OBSERVATION_PERIOD_OBSERVED_BY_MONTH_CHART__NO_DATA)}</div>
      </ChartContainer>
    );
  }

  // Sort data based on MONTHYEAR
  data = data.sort((a: any, b: any) => a["MONTHYEAR"] - b["MONTHYEAR"]);
  // Parse and format line chart data
  // Parse MONTHYEAR from e.g 200910 -> 10/2009
  const lineChartXAxisData = data.map(
    (obj: any) => obj["MONTHYEAR"].toString().slice(-2) + "/" + obj["MONTHYEAR"].toString().slice(0, 4)
  );
  const series = [
    {
      type: "line",
      data: data.map((obj: any) => obj["COUNTVALUE"]),
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
        lineChartFormatConfig={{ tooltipFormat }}
      />
    </div>
  );
};

export default ObservationPeriodObservedByMonthChart;
