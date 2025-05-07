import React, { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import survivalData from "./survival_data.json"; // Assuming you have a JSON file with survival data

const colors = [
  "#E41A1C", // Red
  "#377EB8", // Blue
  "#4DAF4A", // Green
  "#984EA3", // Purple
  "#FF7F00", // Orange
  "#FFFF33", // Yellow
  "#A65628", // Brown
  "#F781BF", // Pink
  "#999999", // Grey
  "#00CED1", // Turquoise
];

let data1 = [];
const [probData, cData] = survivalData;
let prevTime = [];
const facets = [...new Set(probData.facet_var)];
console.log(facets);
for (let index = 0; index < probData.x.length; index++) {
  const facetIndex = facets.indexOf(probData.facet_var[index]);
  // if (probData.facet_var[index] !== "strata_above_90_14") {
  //   // if (probData.facet_var[index] !== "strata_viral_sinusitis_15") {
  //   continue;
  // }
  const point = {
    time: probData.x[index],
    probability: probData.y[index],
    confidenceLower: cData.ymin[index],
    confidenceUpper: cData.ymax[index],
  };
  if (!data1[facetIndex]) {
    data1[facetIndex] = [];
  }
  if (prevTime[facetIndex] === probData.x[index]) {
    data1[facetIndex][data1[facetIndex].length - 1] = point;
  } else {
    data1[facetIndex].push(point);
  }
  prevTime[facetIndex] = probData.x[index];
}
const data = data1;
console.log(data);
const data2 = [
  { time: 0, probability: 1.0, confidenceLower: 1.0, confidenceUpper: 1.0 },
  {
    time: 30,
    probability: 0.95,
    confidenceLower: 0.92,
    confidenceUpper: 0.98,
  },
  {
    time: 60,
    probability: 0.9,
    confidenceLower: 0.86,
    confidenceUpper: 0.94,
  },
  {
    time: 90,
    probability: 0.85,
    confidenceLower: 0.8,
    confidenceUpper: 0.9,
  },
  {
    time: 120,
    probability: 0.82,
    confidenceLower: 0.76,
    confidenceUpper: 0.88,
  },
  {
    time: 150,
    probability: 0.78,
    confidenceLower: 0.71,
    confidenceUpper: 0.85,
  },
  {
    time: 180,
    probability: 0.72,
    confidenceLower: 0.65,
    confidenceUpper: 0.79,
  },
  {
    time: 210,
    probability: 0.68,
    confidenceLower: 0.61,
    confidenceUpper: 0.75,
  },
  {
    time: 240,
    probability: 0.65,
    confidenceLower: 0.58,
    confidenceUpper: 0.72,
  },
  {
    time: 270,
    probability: 0.62,
    confidenceLower: 0.54,
    confidenceUpper: 0.7,
  },
  {
    time: 300,
    probability: 0.6,
    confidenceLower: 0.51,
    confidenceUpper: 0.69,
  },
  {
    time: 330,
    probability: 0.58,
    confidenceLower: 0.48,
    confidenceUpper: 0.68,
  },
  {
    time: 360,
    probability: 0.55,
    confidenceLower: 0.45,
    confidenceUpper: 0.65,
  },
];

const generateSeriesData = () => {
  let seriesData = [];
  data.forEach((d, i) => {
    seriesData = seriesData.concat([
      // Confidence intervals
      {
        name: "Lower Bound",
        type: "line",
        step: "end",
        data: d.map((item) => item.confidenceLower),
        lineStyle: {
          opacity: 0,
        },
        areaStyle: {
          opacity: 0,
        },
        stack: "confidence-band" + i,
        symbol: "none",
        z: i,
      },
      {
        name: "Confidence Interval",
        type: "line",
        step: "end",
        data: d.map((item) => item.confidenceUpper - item.confidenceLower),
        lineStyle: {
          opacity: 0,
        },
        areaStyle: {
          color: colors[i],
          opacity: 0.2,
        },
        stack: "confidence-band" + i,
        symbol: "none",
        z: i,
      },
      // Dashed lines for confidence bounds
      {
        name: "Lower CI",
        type: "line",
        step: "end",
        data: d.map((item) => item.confidenceLower),
        lineStyle: {
          type: "dashed",
          opacity: 0,
          color: colors[i],
        },
        showSymbol: false,
        symbol: "none",
        z: i,
        tooltip: { show: false },
      },
      {
        name: "Upper CI",
        type: "line",
        step: "end",
        data: d.map((item) => item.confidenceUpper),
        lineStyle: {
          type: "dashed",
          opacity: 0,
        },
        showSymbol: false,
        symbol: "none",
        z: i,
        tooltip: { show: false },
      },
      // Main survival curve
      {
        name: "Survival Curve",
        type: "line",
        step: "end",
        data: d.map((item) => item.probability),
        itemStyle: {
          color: colors[i],
        },
        lineStyle: {
          width: 2,
        },
        symbolSize: 6,
        showSymbol: false,
        z: i,
      },
    ]);
  });
  console.log("seriesData", seriesData);
  return seriesData;
};
function App() {
  const getOption = () => {
    if (!data) return {};

    return {
      title: {
        text: "Kaplan-Meier Survival Curve",
        left: "center",
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          animation: false,
          label: {
            backgroundColor: "#ccc",
            borderColor: "#aaa",
            borderWidth: 1,
            shadowBlur: 0,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            color: "#222",
          },
        },
        formatter: function (params) {
          // Get the time value from the hovered point
          const timeIndex = params[0].dataIndex;
          const hoveredTime = data[0][timeIndex]?.time;

          let tooltip = `Time: ${hoveredTime} days<br/><br/>`;

          // Add data for each facet
          facets.forEach((facet, facetIndex) => {
            // Find the data point for this facet at this time
            const facetData = data[facetIndex];
            if (!facetData) return;

            const dataPoint =
              facetData.find((point) => point.time === hoveredTime) ||
              facetData[timeIndex] ||
              facetData[facetData.length - 1];

            if (dataPoint) {
              // Add color indicator with the corresponding color
              tooltip += `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${colors[facetIndex]};"></span>`;
              tooltip += `<b>${facet}:</b><br/>`;
              tooltip += `Survival Probability: ${(
                dataPoint.probability * 100
              ).toFixed(2)}%<br/>`;
              tooltip += `95% CI: [${(dataPoint.confidenceLower * 100).toFixed(
                2
              )}%, ${(dataPoint.confidenceUpper * 100).toFixed(2)}%]<br/><br/>`;
            }
          });

          return tooltip;
        },
      },
      xAxis: {
        type: "category",
        name: "Time (days)",
        nameLocation: "middle",
        nameGap: 30,
        data: (() => {
          let dataWithLongestTime = data[0];
          data.forEach((d) => {
            if (d.length > dataWithLongestTime.length) {
              dataWithLongestTime = d;
            }
          });

          return dataWithLongestTime.map(function (item) {
            return item.time;
          });
        })(),
      },
      yAxis: {
        type: "value",
        name: "Survival Probability",
        nameLocation: "middle",
        nameGap: 40,
        min: 0,
        max: 1,
        axisLabel: {
          formatter: (value) => `${(value * 100).toFixed(0)}%`,
        },
      },
      grid: {
        left: "5%",
        right: "5%",
        bottom: "10%",
        containLabel: true,
      },
      legend: {
        data: ["Survival Curve", "Confidence Interval"],
        bottom: 10,
      },
      series: generateSeriesData(),
    };
  };

  return (
    <div>
      <ReactECharts
        option={getOption()}
        style={{ height: "600px", width: "100%" }}
      />
    </div>
  );
}

export default App;
