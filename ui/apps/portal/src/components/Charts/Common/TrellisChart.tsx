import React, { FC } from "react";

import ReactECharts from "echarts-for-react";
import ChartContainer from "./ChartContainer";
import { chartColors } from "./chartColors";
import "./TrellisChart.scss";

interface TrellisChartProps {
  series: any[];
  grid: any[];
  gridTitles: any[];
  title: string;
  xAxis: any[];
  yAxis: any[];
  numRows?: number;
}

const TrellisChart: FC<TrellisChartProps> = ({ series, grid, gridTitles, title, xAxis, yAxis, numRows = 1 }) => {
  const option = {
    legend: { left: 0 },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
      },
    },
    toolbox: {
      show: true,
      top: "bottom",
      feature: {
        dataZoom: {
          yAxisIndex: "none",
        },
        dataView: { readOnly: false },
        magicType: { type: ["line", "bar"] },
        restore: {},
        saveAsImage: {},
      },
    },
    title: gridTitles,
    grid: grid,
    xAxis: xAxis,
    yAxis: yAxis,
    series: series,
    color: chartColors,
  };

  const minHeight = 500 * numRows;

  return (
    <ChartContainer title={title}>
      <ReactECharts
        style={{
          height: "100%",
          minHeight,
          width: "100%",
        }}
        option={option}
      />
    </ChartContainer>
  );
};

export default TrellisChart;
