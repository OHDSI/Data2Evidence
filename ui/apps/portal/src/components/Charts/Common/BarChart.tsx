import React, { FC } from "react";

import ChartContainer from "./ChartContainer";
import LineChart from "./LineChart";

import "./BarChart.scss";
import { useTranslation } from "../../../contexts";

interface BarChartProps {
  barChartData: { data: number[]; labels: string[] };
  title: string;
  xAxisName: string;
  yAxisName: string;
  tooltipFormat: string;
}

const BarChart: FC<BarChartProps> = ({ barChartData, title, xAxisName, yAxisName, tooltipFormat }) => {
  const { getText, i18nKeys } = useTranslation();
  if (barChartData.data.length === 0) {
    return (
      <ChartContainer title={title}>
        <div className="no_data_text">{getText(i18nKeys.BAR_CHART__NO_DATA)}</div>
      </ChartContainer>
    );
  }

  const series = [
    {
      data: barChartData.data,
      type: "bar",
      barCategoryGap: "5%",
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: "rgba(0, 0, 0, 0.5)",
          color: "rgba(0, 0, 255, 0.9)",
        },
      },
    },
  ];

  return (
    <div>
      <LineChart
        lineChartXAxisData={barChartData.labels}
        series={series}
        title={title}
        xAxisName={xAxisName}
        yAxisName={yAxisName}
        lineChartFormatConfig={{ tooltipFormat }}
      />
    </div>
  );
};

export default BarChart;
