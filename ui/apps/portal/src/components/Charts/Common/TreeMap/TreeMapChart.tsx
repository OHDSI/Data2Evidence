import React, { FC, useRef, useState, useEffect } from "react";

import ReactECharts from "echarts-for-react";
import "./TreeMapChart.scss";
import { useTranslation } from "../../../../contexts";
import { useTheme } from "@mui/material";

interface TreeMapChartProps {
  data: any[];
  title: string;
  setSelectedConcept: (value: { id: string; name: string } | null) => void;
  extraChartConfigs?: any;
}

const TreeMapChart: FC<TreeMapChartProps> = ({ data, title, setSelectedConcept, extraChartConfigs }) => {
  const { getText, i18nKeys } = useTranslation();
  const chartRef = useRef<any>(null);
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const theme = useTheme();

  // Create a unique key for each item
  const getItemKey = (item: any) => {
    return item.value?.[4] || "";
  };

  // Initialize chart data with itemStyle for each item
  useEffect(() => {
    const dataWithStyles = data.map((item) => {
      const itemKey = getItemKey(item);
      if (itemKey && itemKey === selectedItemKey) {
        return {
          ...item,
          itemStyle: {
            borderColor: theme.palette.custom.selectedRowBorder,
            borderWidth: 3,
          },
        };
      }
      return item;
    });
    setChartData(dataWithStyles);
  }, [data, selectedItemKey]);

  // Calculate min and max records per person from data
  const recordsPerPersonValues = data.length > 0 ? data.map((item) => item.value?.[1] || 0) : [0, 100];
  const minRecordsPerPerson = Math.min(...recordsPerPersonValues);
  const maxRecordsPerPerson = Math.max(...recordsPerPersonValues);

  const option = {
    tooltip: {
      formatter: function (info: any) {
        const value = info.value;
        const numPersons = value[0];
        const recordsPerPerson = value[1];
        const percentPersons = value[2];
        const conceptPath = value[4] || info.name;

        // Parse conceptPath string, replace || with breaklines with growing indentation
        const parsedConceptPath = conceptPath
          .split("||")
          .map((e: string, index: number) => {
            return `<div style="padding-left: ${index * 10}px">${e.trim()}</div>`;
          })
          .join("");
        const formattedPrevalence = parseFloat(percentPersons).toFixed(5);
        return [
          `<div class="tooltip-title">${parsedConceptPath}</div>`,
          `${getText(i18nKeys.TREE_MAP_CHART__PREVALENCE)}: ${formattedPrevalence}<br>`,
          `${getText(i18nKeys.TREE_MAP_CHART__NUMBER_OF_PEOPLE)}: ${numPersons}<br>`,
          `${getText(i18nKeys.TREE_MAP_CHART__RECORDS_PER_PERSON)}: ${recordsPerPerson}`,
        ].join("");
      },
      confine: true,
      className: "treemap-tooltip",
    },
    toolbox: {
      show: true,
      feature: {
        dataView: { readOnly: false },
        saveAsImage: {},
        restore: {},
      },
    },
    visualMap: {
      type: "continuous",
      min: minRecordsPerPerson,
      max: maxRecordsPerPerson,
      text: ["", getText(i18nKeys.TREE_MAP_CHART__RECORDS_PER_PERSON)],
      calculable: true,
      hoverLink: false,
      orient: "horizontal",
      left: "center",
      bottom: "-4px",
      dimension: 1,
      inRange: {
        color: theme.palette.custom.treeMapLegendColor,
      },
      textStyle: {
        color: theme.palette.text.primary,
        fontSize: 16,
      },
      formatter: (value: number) => {
        return `${value.toFixed(2)}`;
      },
    },
    series: [
      {
        name: title,
        type: "treemap",
        data: chartData,
        breadcrumb: {
          show: false,
        },
        roam: false,
        visibleMin: 1000,
        itemStyle: {
          borderColor: "black",
          gapWidth: 1,
        },
        label: {
          color: "black",
        },
        visualDimension: 1,
      },
    ],
    ...(extraChartConfigs && { ...extraChartConfigs }),
  };

  const handleNodeClick = (conceptId: string, conceptName: string, conceptPath: string, itemName: string) => {
    setSelectedConcept({ id: conceptId, name: conceptName });
    // Use conceptPath (value[4]) or name as the unique key
    const itemKey = conceptPath || itemName;
    setSelectedItemKey(itemKey);
  };

  const onEvents = {
    click: (e: any) => {
      // e.value[3] = conceptId, e.value[4] = conceptPath, e.name = display name
      return handleNodeClick(e.value[3], e.value[4], e.value[4], e.name);
    },
  };

  return (
    <>
      <ReactECharts
        ref={chartRef}
        style={{
          height: "100%",
          minHeight: 500,
          width: "100%",
        }}
        option={option}
        onEvents={onEvents}
        notMerge={false}
        lazyUpdate={true}
      />
      <div className="legend-box-size">{getText(i18nKeys.TREE_MAP_CHART__CHART_LEGEND)}</div>
    </>
  );
};

export default TreeMapChart;
