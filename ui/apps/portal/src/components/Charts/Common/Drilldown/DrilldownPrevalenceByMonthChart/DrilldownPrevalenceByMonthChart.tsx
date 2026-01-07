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
  const xAxisName = getText(i18nKeys.DRILLDOWN_PREVALENCE_BY_MONTH_CHART__X_AXIS_NAME);
  const yAxisName = getText(i18nKeys.DRILLDOWN_PREVALENCE_BY_MONTH_CHART__Y_AXIS_NAME);
  const tooltipFormat = getText(i18nKeys.DRILLDOWN_PREVALENCE_BY_MONTH_CHART__TOOLTIP_FORMAT);
  const yAxisFormat = getText(i18nKeys.DRILLDOWN_PREVALENCE_BY_MONTH_CHART__Y_AXIS_FORMAT);

  if (data.length === 0) {
    return (
      <ChartContainer title={title}>
        <div className="no_data_text">{getText(i18nKeys.DRILLDOWN_PREVALENCE_BY_MONTH_CHART__NO_DATA)}</div>
      </ChartContainer>
    );
  }

  // Parse and format line chart data
  // Parse XCALENDARMONTH from e.g 200910 -> 10/2009
  const lineChartXAxisData = data.map(
    (obj: any) => obj["XCALENDARMONTH"].toString().slice(-2) + "/" + obj["XCALENDARMONTH"].toString().slice(0, 4)
  );

  const series = [
    {
      type: "line",
      data: data.map((obj: any) => Number(obj["YPREVALENCE1000PP"]).toFixed()),
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
