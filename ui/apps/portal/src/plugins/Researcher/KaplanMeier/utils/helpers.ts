import { GraphData } from "./types";

// Colors for different cohort lines
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

// Process the data into a facet-organized structure
export const processGraphDataByFacets = (
  data: GraphData,
  isCompetingRisk = false
): Array<{
  facet: string;
  data: Array<{
    time: number;
    probability: number;
    confidenceLower: number;
    confidenceUpper: number;
  }>;
}> => {
  if (!data.timeX || !data.survivalY || !data.timeX.length) {
    return [];
  }

  const facets = isCompetingRisk ? ["outcome", "competing_outcome"] : [...new Set(data.strataName)];

  const graphData: Array<{
    facet: string;
    data: Array<{
      time: number;
      probability: number;
      confidenceLower: number;
      confidenceUpper: number;
    }>;
  }> = [];

  // Initialize the array
  facets.forEach((val) => {
    graphData.push({ facet: String(val), data: [] });
  });

  // Process data by facet
  for (let i = 0; i < data.timeX.length; i++) {
    if (data.strataLevel?.[i] === "FALSE") {
      continue;
    }
    const facetIndex = isCompetingRisk ? (i < data.timeX.length / 2 ? 0 : 1) : facets.indexOf(data.strataName[i]);

    const point = {
      time: data.timeX[i],
      probability: data.survivalY[i],
      confidenceLower: data.confidenceLowerY![i],
      confidenceUpper: data.confidenceUpperY![i],
    };
    graphData[facetIndex].data.push(point);
  }
  return graphData;
};

export const generateSeriesData = (
  processedData: Array<{
    facet: string;
    data: Array<{
      time: number;
      probability: number;
      confidenceLower?: number;
      confidenceUpper?: number;
    }>;
  }>
) => {
  const seriesData: any[] = [];

  processedData.forEach((facetGroup, facetIndex) => {
    const facetName = facetGroup.facet;
    const d = facetGroup.data;

    // Add lower bound area (base)
    seriesData.push({
      name: `${facetName} - Lower Bound`,
      type: "line",
      step: "end",
      data: d.map((item) => [item.time, item.confidenceLower]),
      lineStyle: { opacity: 0 },
      areaStyle: { opacity: 0 },
      stack: `confidence-band-${facetGroup.facet}`,
      symbol: "none",
      z: facetIndex,
      tooltip: { show: false },
    });

    // Add confidence interval area
    seriesData.push({
      name: `${facetName} - CI`,
      type: "line",
      step: "end",
      data: d.map((item) => [item.time, item.confidenceUpper! - item.confidenceLower!]),
      lineStyle: { opacity: 0 },
      areaStyle: {
        color: colors[facetIndex % colors.length],
        opacity: 0.2,
      },
      stack: `confidence-band-${facetGroup.facet}`,
      symbol: "none",
      z: facetIndex,
      tooltip: { show: false },
    });

    // Add dashed lines for confidence bounds
    seriesData.push({
      name: `${facetName} - Lower CI`,
      type: "line",
      step: "end",
      data: d.map((item) => [item.time, item.confidenceLower]),
      lineStyle: {
        type: "dashed",
        opacity: 0.5,
        color: colors[facetIndex % colors.length],
        width: 1,
      },
      showSymbol: false,
      symbol: "none",
      z: facetIndex,
      tooltip: { show: false },
    });

    seriesData.push({
      name: `${facetName} - Upper CI`,
      type: "line",
      step: "end",
      data: d.map((item) => [item.time, item.confidenceUpper]),
      lineStyle: {
        type: "dashed",
        opacity: 0.5,
        color: colors[facetIndex % colors.length],
        width: 1,
      },
      showSymbol: false,
      symbol: "none",
      z: facetIndex,
      tooltip: { show: false },
    });

    // Main survival curve
    seriesData.push({
      name: facetName,
      type: "line",
      step: "end",
      data: d.map((item) => [item.time, item.probability]),
      itemStyle: { color: colors[facetIndex % colors.length] },
      lineStyle: { width: 2 },
      symbolSize: 6,
      showSymbol: false,
      z: facetIndex + 10, // Ensure main lines are on top
    });
  });

  return seriesData;
};

export const getKaplanMeierGraphOption = (data: GraphData | null, isCompetingRisk: boolean) => {
  if (!data || !data.timeX.length) {
    return {
      title: {
        text: isCompetingRisk ? "Cumulative Incidence Functions" : "Cohort Survival",
        left: "center",
      },
      xAxis: {
        type: "category",
        name: "Days",
      },
      yAxis: {
        type: "value",
        name: isCompetingRisk ? "Cumulative Failure Probability" : "Survival Probability",
      },
    };
  }

  // Process data into facet groups - pass isCompetingRisk flag based on presence of competingOutcomeCohort
  const processedData = processGraphDataByFacets(data, isCompetingRisk);

  // Generate series data from processed facets
  const seriesData = generateSeriesData(processedData);

  // Get the list of unique facet names for the legend
  const legendData = processedData.map(({ facet }) => facet);

  // Get the longest time series for X axis
  let allTimes: number[] = [];
  processedData.forEach((facet) => {
    allTimes = [...allTimes, ...facet.data.map((d) => d.time)];
  });
  allTimes = [...new Set(allTimes)].sort((a, b) => a - b);

  const option = {
    toolbox: {
      feature: {
        dataZoom: {
          yAxisIndex: "none",
        },
        restore: {},
        saveAsImage: {},
      },
    },
    title: {
      text: isCompetingRisk ? "Cumulative Incidence Functions" : "Cohort Survival",
      left: "center",
    },
    xAxis: {
      type: "category",
      name: "Days",
      nameLocation: "middle",
      nameGap: 30,
    },
    yAxis: {
      type: "value",
      name: isCompetingRisk ? "Cumulative Failure Probability" : "Survival Probability",
      nameLocation: "middle",
      nameGap: 40,
      min: 0,
      max: 1,
      axisLabel: {
        formatter: (value: number) => `${(value * 100).toFixed(0)}%`,
      },
    },
    grid: {
      left: "5%",
      right: "5%",
      bottom: "10%",
      containLabel: true,
    },
    legend: {
      data: legendData,
      bottom: 10,
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
      formatter: function (params: any) {
        const time = params[0].axisValue;
        let tooltip = `Days: ${Math.floor(time)}<br/><br/>`;

        // Group by facets and display data for each facet
        processedData.forEach((facetGroup, facetIndex) => {
          const facetName = facetGroup.facet;
          const displayColor = colors[facetIndex % colors.length];

          // Find the closest data point for this time
          const dataPoint =
            facetGroup.data.find((d) => d.time === parseFloat(time)) ||
            facetGroup.data.reduce(
              (closest, current) =>
                Math.abs(current.time - parseFloat(time)) < Math.abs(closest.time - parseFloat(time))
                  ? current
                  : closest,
              facetGroup.data[0]
            );

          if (dataPoint) {
            // Add color indicator
            tooltip += `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${displayColor};"></span>`;
            tooltip += `<b>${facetName}:</b><br/>`;
            tooltip += `Probability: ${(dataPoint.probability * 100).toFixed(2)}%<br/>`;

            // Add confidence intervals if available
            tooltip += `95% CI: [${(dataPoint.confidenceLower * 100).toFixed(2)}%, ${(
              dataPoint.confidenceUpper * 100
            ).toFixed(2)}%]<br/><br/>`;
          }
        });

        return tooltip;
      },
    },
    series: seriesData,
  };
  return option;
};
