import React, { FC } from "react";

import ReactECharts from "echarts-for-react";
import "./TreeMapChart.scss";
import { useTranslation } from "../../../../contexts";

interface TreeMapChartProps {
  data: any[];
  title: string;
  setSelectedConceptId: (value: string) => void;
  extraChartConfigs?: any;
}

const TreeMapChart: FC<TreeMapChartProps> = ({ data, title, setSelectedConceptId, extraChartConfigs }) => {
  const { getText, i18nKeys } = useTranslation();
  const option = {
    tooltip: {
      formatter: function (info: any) {
        const value = info.value;
        const conceptPath = info.name;
        const numPersons = value[0];
        const recordsPerPerson = value[1];
        const percentPersons = value[2];

        // Parse conceptPath string, replace || with breaklines with growing indentation
        const parsedConceptPath = conceptPath
          .split("||")
          .map((e: string, index: number) => {
            return e + "<br>" + "&nbsp;".repeat(index + 1);
          })
          .join("");
        return [
          `<div class="tooltip-title">${parsedConceptPath}</div>`,
          `${getText(i18nKeys.TREE_MAP_CHART__PREVALENCE)}: ${percentPersons}<br>`,
          `${getText(i18nKeys.TREE_MAP_CHART__NUMBER_OF_PEOPLE)}: ${numPersons}<br>`,
          `${getText(i18nKeys.TREE_MAP_CHART__RECORDS_PER_PERSON)}: ${recordsPerPerson}`,
        ].join("");
      },
      confine: true,
      textStyle: {
        overflow: "break",
        width: 10,
      },
    },
    toolbox: {
      show: true,
      feature: {
        dataView: { readOnly: false },
        saveAsImage: {},
        restore: {},
      },
    },
    series: [
      {
        name: title,
        type: "treemap",
        data: data,
        breadcrumb: {
          show: false,
        },
        roam: false,
        visibleMin: 1000,
        itemStyle: {
          borderColor: "black",
        },
        visualDimension: 1,
        levels: [
          {
            color: ["#aaa", "#269f3c"],
            colorMappingBy: "value",
            itemStyle: {
              gapWidth: 1,
            },
          },
        ],
      },
    ],
    ...(extraChartConfigs && { ...extraChartConfigs }),
  };

  const handleNodeClick = (conceptId: string) => {
    setSelectedConceptId(conceptId);
  };

  const onEvents = {
    click: (e: any) => handleNodeClick(e.value[3]),
  };

  return (
    <>
      <ReactECharts
        style={{
          height: "100%",
          minHeight: 500,
          width: "100%",
        }}
        option={option}
        onEvents={onEvents}
      />
      <div>{getText(i18nKeys.TREE_MAP_CHART__CHART_LEGEND)}</div>
    </>
  );
};

export default TreeMapChart;
