import React, { FC } from "react";

import LineChart from "../../../Common/LineChart";
import ChartContainer from "../../../Common/ChartContainer";

import "./DeathPrevalenceByMonthChart.scss";
import { useTranslation } from "../../../../../contexts";

interface DeathPrevalenceByMonthChartProps {
  data: any;
}

const DeathPrevalenceByMonthChart: FC<DeathPrevalenceByMonthChartProps> = ({ data }) => {
  const { getText, i18nKeys } = useTranslation();
  const title = getText(i18nKeys.DEATH_PREVALENCE_BY_MONTH_CHART__TITLE);
  const xAxisName = getText(i18nKeys.DEATH_PREVALENCE_BY_MONTH_CHART__X_AXIS_NAME);
  const yAxisName = getText(i18nKeys.DEATH_PREVALENCE_BY_MONTH_CHART__Y_AXIS_NAME);
  const tooltipFormat = getText(i18nKeys.DEATH_PREVALENCE_BY_MONTH_CHART__TOOLTIP_FORMAT);
  const yAxisFormat = getText(i18nKeys.DEATH_PREVALENCE_BY_MONTH_CHART__Y_AXIS_FORMAT);

  if (data.length === 0) {
    return (
      <ChartContainer title={title}>
        <div className="no_data_text">{getText(i18nKeys.DEATH_PREVALENCE_BY_MONTH_CHART__NO_DATA)}</div>
      </ChartContainer>
    );
  }

  // Sort data by XCALENDARMONTH
  const sortedData = [...data].sort((a: any, b: any) => {
    return Number(a["XCALENDARMONTH"]) - Number(b["XCALENDARMONTH"]);
  });

  // Parse and format line chart data
  // XCALENDARMONTH should be in YYYYMM format
  const lineChartXAxisData = sortedData.map(
    (obj: any) => obj["XCALENDARMONTH"].toString().slice(-2) + "/" + obj["XCALENDARMONTH"].toString().slice(0, 4)
  );
  // Convert YPREVALENCE1000PP to percentage
  const series = [
    {
      type: "line",
      step: "start",
      data: sortedData.map((obj: any) => Number(Number(obj["YPREVALENCE1000PP"]).toFixed(3))),
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

export default DeathPrevalenceByMonthChart;
