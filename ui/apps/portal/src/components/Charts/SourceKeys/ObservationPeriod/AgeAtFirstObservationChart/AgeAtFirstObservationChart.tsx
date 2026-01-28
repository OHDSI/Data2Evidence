import React, { FC } from "react";
import BarChart from "../../../Common/BarChart";
import { parseBarChartData, formatBigPositiveNumber } from "../../../util";
import { useTranslation } from "../../../../../contexts";

interface AgeAtFirstObservationChartProps {
  data: any;
  axisBaseGap?: number;
}

const AgeAtFirstObservationChart: FC<AgeAtFirstObservationChartProps> = ({ data, axisBaseGap }) => {
  const { getText, i18nKeys } = useTranslation();

  return (
    <BarChart
      barChartData={parseBarChartData(data)}
      title={getText(i18nKeys.OBSERVATION_PERIOD__AGE_AT_FIRST_OBSERVATION_CHART_TITLE)}
      xAxisName={getText(i18nKeys.OBSERVATION_PERIOD__AGE_AT_FIRST_OBSERVATION_CHART_X_AXIS_NAME)}
      yAxisName={getText(i18nKeys.OBSERVATION_PERIOD__AGE_AT_FIRST_OBSERVATION_CHART_Y_AXIS_NAME)}
      tooltipFormat={getText(i18nKeys.OBSERVATION_PERIOD__AGE_AT_FIRST_OBSERVATION_CHART_TOOLTIP_FORMAT)}
      yAxisFormat={formatBigPositiveNumber}
      axisBaseGap={axisBaseGap}
    />
  );
};

export default AgeAtFirstObservationChart;
