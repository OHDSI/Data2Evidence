import React, { useState, useEffect, FC } from "react";
import ChartContainer from "../ChartContainer";
import TreeMapChart from "./TreeMapChart";
import TreeMapTable from "./TreeMapTable";
import { Tabs, Tab } from "@mui/material";

import "./TreeMapChartTable.scss";
import { useTranslation } from "../../../../contexts";

interface TreeMapChartTableProps {
  title: string;
  data: any;
  setSelectedConceptId: (value: string) => void;
}

enum TreeMapChartTab {
  TreeMap,
  Table,
}

// Detect if data is in simple format (CONCEPTID, CONCEPTNAME, COUNTVALUE)
const hasSimpleFormatData = (data: any[]) => {
  if (data.length === 0) return false;
  return "COUNTVALUE" in data[0] && "CONCEPTNAME" in data[0];
};

const TreeMapChartTable: FC<TreeMapChartTableProps> = ({ title, data, setSelectedConceptId }) => {
  const { getText, i18nKeys } = useTranslation();
  const [treeMapChartData, setTreeMapChartData] = useState<any[]>([]);
  const [treeMapTableData, setTreeMapTableData] = useState<any[]>([]);
  const [tabValue, setTabValue] = useState(TreeMapChartTab.TreeMap);
  const [isSimple, setIsSimple] = useState(false);

  useEffect(() => {
    const simpleFormat = hasSimpleFormatData(data);
    setIsSimple(simpleFormat);

    if (simpleFormat) {
      // Parse simple format (CONCEPTID, CONCEPTNAME, COUNTVALUE)
      const total = data.reduce((sum: number, item: any) => sum + item.COUNTVALUE, 0);
      const parsedData = data.map((obj: any) => ({
        ...obj,
        CONCEPTPATH: obj.CONCEPTNAME,
        NUMPERSONS: obj.COUNTVALUE,
        PERCENT_PERSONS: `${((obj.COUNTVALUE / total) * 100).toPrecision(3)}%`,
      }));
      setTreeMapTableData(parsedData);
    } else {
      // Parse existing format (with RECORDSPERPERSON, LENGTHOFERA, etc.)
      const parsedData = data.map((obj: any) => ({
        ...obj,
        RECORDSPERPERSON: Number(Number(obj["RECORDSPERPERSON"]).toPrecision(3)),
        LENGTH_OF_ERA: Number(Number(obj["LENGTHOFERA"]).toPrecision(3)),
        PERCENT_PERSONS: `${Number(Number(obj["PERCENTPERSONS"]) * 100).toPrecision(3)}%`,
      }));
      setTreeMapTableData(parsedData);
    }
  }, [data]);

  useEffect(() => {
    if (isSimple) {
      // Parse simple format for treemap chart
      const total = data.reduce((sum: number, item: any) => sum + item.COUNTVALUE, 0);
      const mappedData = data.map((obj: any) => ({
        name: obj.CONCEPTNAME,
        value: [
          obj.COUNTVALUE,
          1, // placeholder for RECORDSPERPERSON
          `${((obj.COUNTVALUE / total) * 100).toPrecision(3)}%`,
          obj.CONCEPTID,
        ],
      }));
      setTreeMapChartData(mappedData);
    } else {
      // Parse existing format for treemap chart
      const mappedData = treeMapTableData.map((obj: any) => ({
        name: obj["CONCEPTPATH"],
        value: [
          obj["NUMPERSONS"],
          obj["RECORDSPERPERSON"] ? obj["RECORDSPERPERSON"] : obj["LENGTHOFERA"],
          obj["PERCENTPERSONS"],
          obj["CONCEPTID"],
        ],
      }));
      setTreeMapChartData(mappedData);
    }
  }, [treeMapTableData, isSimple, data]);

  if (data.length === 0) {
    return (
      <ChartContainer title={title}>
        <div className="no_data_text">{getText(i18nKeys.TREE_MAP_CHART_TABLE__NO_DATA)}</div>
      </ChartContainer>
    );
  }

  const handleTabSelectionChange = async (event: React.SyntheticEvent, value: number) => {
    setTabValue(value);
  };

  return (
    <ChartContainer title={title}>
      <Tabs value={tabValue} onChange={handleTabSelectionChange}>
        <Tab label={getText(i18nKeys.TREE_MAP_CHART_TABLE__LABEL_TREEMAP)}></Tab>
        <Tab label={getText(i18nKeys.TREE_MAP_CHART_TABLE__LABEL_TABLE)}></Tab>
      </Tabs>
      {tabValue === TreeMapChartTab.TreeMap && (
        <TreeMapChart data={treeMapChartData} title={title} setSelectedConceptId={setSelectedConceptId} />
      )}
      {tabValue === TreeMapChartTab.Table && (
        <TreeMapTable data={treeMapTableData} setSelectedConceptId={setSelectedConceptId} isSimpleFormat={isSimple} />
      )}
    </ChartContainer>
  );
};

export default TreeMapChartTable;
