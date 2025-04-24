import React, { FC } from "react";

import ReactECharts from "echarts-for-react";
import ChartContainer from "./ChartContainer";
import "./PieChart.scss";

interface PieChartProps {
  data: any[];
  title: string;
  extraChartConfigs?: any;
}

const PieChart: FC<PieChartProps> = ({ data, title, extraChartConfigs }) => {
  if (data.length === 0) {
    return (
      <ChartContainer title={title}>
        <div className="no_data_text">No data</div>
      </ChartContainer>
    );
  }

  const option = {
    tooltip: {
      trigger: "item",
    },
    legend: {
      orient: "horizontal",
    },
    toolbox: {
      show: true,
      bottom: 0,
      feature: {
        dataView: { readOnly: false },
        saveAsImage: {},
        restore: {},
      },
    },
    series: [
      {
        name: title,
        type: "pie",
        radius: "50%",
        itemStyle: {
          borderColor: "#fff",
          borderWidth: "3",
        },
        data: data,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      },
    ],
    ...(extraChartConfigs && { ...extraChartConfigs }),
  };

  return (
    <ChartContainer title={title}>
      <ReactECharts
        style={{
          height: "100%",
          minHeight: 400,
          width: "100%",
        }}
        option={option}
      />
    </ChartContainer>
  );
};

export default PieChart;
