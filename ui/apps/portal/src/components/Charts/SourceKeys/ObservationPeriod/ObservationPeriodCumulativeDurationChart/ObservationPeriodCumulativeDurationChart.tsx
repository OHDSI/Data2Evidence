import React, { FC } from "react";

import LineChart from "../../../Common/LineChart";
import ChartContainer from "../../../Common/ChartContainer";

import "./ObservationPeriodCumulativeDurationChart.scss";
import { useTranslation } from "../../../../../contexts";

interface ObservationPeriodCumulativeDurationChartProps {
  data: any;
}

const ObservationPeriodCumulativeDurationChart: FC<ObservationPeriodCumulativeDurationChartProps> = ({ data }) => {
  const { getText, i18nKeys } = useTranslation();
  const title = getText(i18nKeys.OBSERVATION_PERIOD_CUMULATIVE_DURATION_CHART__TITLE);
  const xAxisName = getText(i18nKeys.OBSERVATION_PERIOD_CUMULATIVE_DURATION_CHART__X_AXIS_NAME);
  const yAxisName = getText(i18nKeys.OBSERVATION_PERIOD_CUMULATIVE_DURATION_CHART__Y_AXIS_NAME);
  const tooltipFormat = getText(i18nKeys.OBSERVATION_PERIOD_CUMULATIVE_DURATION_CHART__TOOLTIP_FORMAT);
  const yAxisFormat = getText(i18nKeys.OBSERVATION_PERIOD_CUMULATIVE_DURATION_CHART__Y_AXIS_FORMAT);

  if (data.length === 0) {
    return (
      <ChartContainer title={title}>
        <div className="no_data_text">{getText(i18nKeys.OBSERVATION_PERIOD_CUMULATIVE_DURATION_CHART__NO_DATA)}</div>
      </ChartContainer>
    );
  }

  // Parse and format line chart data
  // Divide XLENGTHOFOBSERVATION by number of days in a year and round to 1 decimal place
  const lineChartXAxisData = data.map((obj: any) => (obj["XLENGTHOFOBSERVATION"] / 365.25).toFixed(1));
  // Convert YPERCENTPERSONS to percentage
  const series = [
    {
      type: "line",
      step: "start",
      data: data.map((obj: any) => (Number(obj["YPERCENTPERSONS"]) * 100).toFixed(0)),
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

export default ObservationPeriodCumulativeDurationChart;
