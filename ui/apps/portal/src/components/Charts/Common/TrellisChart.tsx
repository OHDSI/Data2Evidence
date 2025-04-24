import React, { FC } from "react";

import ReactECharts from "echarts-for-react";
import ChartContainer from "./ChartContainer";
import "./TrellisChart.scss";

interface TrellisChartProps {
  series: any[];
  grid: any[];
  gridTitles: any[];
  title: string;
  xAxis: any[];
  yAxis: any[];
}

const TrellisChart: FC<TrellisChartProps> = ({ series, grid, gridTitles, title, xAxis, yAxis }) => {
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
  };

  return (
    <ChartContainer title={title}>
      <ReactECharts
        style={{
          height: "100%",
          minHeight: 500,
          width: "100%",
        }}
        option={option}
      />
    </ChartContainer>
  );
};

export default TrellisChart;
