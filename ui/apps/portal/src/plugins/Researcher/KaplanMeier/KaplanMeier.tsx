import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import { Button, Card, Loader } from "@portal/components";
import "./KaplanMeier.scss";
import { useActiveDataset, useFeedback, useTranslation } from "../../../contexts";
import ReactECharts from "echarts-for-react";
import CohortSelector from "./CohortSelector";
import { CohortSurvival } from "../../../axios/cohort-survival";
import { CohortMapping } from "../../../types";
import { i18nKeys } from "../../../contexts/app-context/states";

export interface TerminologyProps extends PageProps<ResearcherStudyMetadata> {}

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

// Transform the data for step plot and confidence intervals
type GraphData = {
  timeX: number[];
  survivalY: number[];
  confidenceLowerY?: number[];
  confidenceUpperY?: number[];
  facetVar?: string[]; // Added facet variable support
};

type GraphDataApi = (
  | {
      x: number[];
      y: number[];
      PANEL: string[];
      group: number[];
      flipped_aes: boolean[];
      colour: string[];
      linewidth: number[];
      linetype: number[];
      alpha: string[];
      ROW: number[];
      COL: number[];
      SCALE_X: number[];
      SCALE_Y: number[];
      ymin?: undefined;
      ymax?: undefined;
      fill?: undefined;
    }
  | {
      ymin: number[];
      ymax: number[];
      x: number[];
      y: number[];
      PANEL: string[];
      group: number[];
      flipped_aes: boolean[];
      colour: string[];
      fill: string[];
      linewidth: number[];
      linetype: number[];
      alpha: number[];
      ROW: number[];
      COL: number[];
      SCALE_X: number[];
      SCALE_Y: number[];
    }
)[];

// Process the data into a facet-organized structure
const processGraphDataByFacets = (
  data: GraphData
): Array<{
  facet: string;
  data: Array<{
    time: number;
    probability: number;
    confidenceLower?: number;
    confidenceUpper?: number;
  }>;
}> => {
  if (!data.timeX || !data.survivalY || !data.timeX.length) {
    return [];
  }

  const facets = data.facetVar ? [...new Set(data.facetVar)] : ["default"]; // If no facets, use 'default'

  const facetData: Array<{
    facet: string;
    data: Array<{
      time: number;
      probability: number;
      confidenceLower?: number;
      confidenceUpper?: number;
    }>;
  }> = [];

  const hasConfidenceIntervals = data.confidenceLowerY && data.confidenceUpperY;

  // Initialize the array for each facet
  facets.forEach((facet) => {
    facetData.push({ facet, data: [] });
  });

  // Process data by facet
  for (let i = 0; i < data.timeX.length; i++) {
    const facetIndex = data.facetVar ? facets.indexOf(data.facetVar[i]) : 0; // Default to the first (and only) facet if no facet variable

    const point = {
      time: data.timeX[i],
      probability: data.survivalY[i],
      confidenceLower: hasConfidenceIntervals ? data.confidenceLowerY![i] : undefined,
      confidenceUpper: hasConfidenceIntervals ? data.confidenceUpperY![i] : undefined,
    };

    // Check if we already have this time point for this facet (to avoid duplicates)
    const prevTime =
      facetData[facetIndex].data.length > 0
        ? facetData[facetIndex].data[facetData[facetIndex].data.length - 1].time
        : null;

    if (prevTime === point.time) {
      facetData[facetIndex].data[facetData[facetIndex].data.length - 1] = point;
    } else {
      facetData[facetIndex].data.push(point);
    }
  }

  return facetData;
};

const generateSeriesData = (
  processedData: Array<{
    facet: string;
    data: Array<{
      time: number;
      probability: number;
      confidenceLower?: number;
      confidenceUpper?: number;
    }>;
  }>,
  cohortNames: { [key: string]: string } // Map from facet to cohort name
) => {
  const seriesData: any[] = [];

  processedData.forEach((facetGroup, facetIndex) => {
    const cohortName = cohortNames[facetGroup.facet] || facetGroup.facet;
    const d = facetGroup.data;
    const hasConfidenceIntervals =
      d.length > 0 && d[0].confidenceLower !== undefined && d[0].confidenceUpper !== undefined;

    if (hasConfidenceIntervals) {
      // Add lower bound area (base)
      seriesData.push({
        name: `${cohortName} - Lower Bound`,
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
        name: `${cohortName} - CI`,
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
        name: `${cohortName} - Lower CI`,
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
        name: `${cohortName} - Upper CI`,
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
    }

    // Main survival curve
    seriesData.push({
      name: cohortName,
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

const getKaplanMeierGraphOption = (
  data: GraphData | null,
  outcomeCohort: CohortMapping,
  competingOutcomeCohort?: CohortMapping | null
) => {
  console.log("getKaplanMeierGraphOption", data, outcomeCohort, competingOutcomeCohort);
  if (!data || !data.timeX.length) {
    return {
      title: {
        text: !competingOutcomeCohort ? "Cohort Survival" : "Cumulative Incidence Functions",
        left: "center",
      },
      xAxis: {
        type: "category",
        name: "Days",
      },
      yAxis: {
        type: "value",
        name: !competingOutcomeCohort ? "Survival Probability" : "Cumulative Failure Probability",
      },
    };
  }

  // Process data by facets
  const cohortNames: { [key: string]: string } = {};

  // If facets exist in the data, use them; otherwise, create default facets
  if (!data.facetVar) {
    if (competingOutcomeCohort) {
      // For competing risk, alternate between outcome and competing outcome
      data.facetVar = data.timeX.map((_, i) => (i % 2 === 0 ? "outcome" : "competing"));
      cohortNames["outcome"] = outcomeCohort.name;
      cohortNames["competing"] = competingOutcomeCohort.name;
    } else {
      // For single outcome, all points belong to the outcome cohort
      data.facetVar = data.timeX.map(() => "outcome");
      cohortNames["outcome"] = outcomeCohort.name;
    }
  }

  // Process data into facet groups
  const processedData = processGraphDataByFacets(data);

  // Generate series data from processed facets
  const seriesData = generateSeriesData(processedData, cohortNames);

  // Get the list of unique facet names for the legend
  const legendData = processedData.map((facet) => cohortNames[facet.facet] || facet.facet);

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
      text: !competingOutcomeCohort ? "Cohort Survival" : "Cumulative Incidence Functions",
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
      name: !competingOutcomeCohort ? "Survival Probability" : "Cumulative Failure Probability",
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
          const cohortName = cohortNames[facetGroup.facet] || facetGroup.facet;
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
            tooltip += `<b>${cohortName}:</b><br/>`;
            tooltip += `Probability: ${(dataPoint.probability * 100).toFixed(2)}%<br/>`;

            // Add confidence intervals if available
            if (dataPoint.confidenceLower !== undefined && dataPoint.confidenceUpper !== undefined) {
              tooltip += `95% CI: [${(dataPoint.confidenceLower * 100).toFixed(2)}%, ${(
                dataPoint.confidenceUpper * 100
              ).toFixed(2)}%]<br/><br/>`;
            }
          }
        });

        return tooltip;
      },
    },
    series: seriesData,
  };
  return option;
};

export const KaplanMeier: FC<TerminologyProps> = () => {
  const { activeDataset } = useActiveDataset();

  const { getText } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isGraphLoading, setIsGraphLoading] = useState(false);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [cohortList, setCohortList] = useState<CohortMapping[]>([]);
  const [targetCohortId, setTargetCohortId] = useState<number | null>(null);
  const [outcomeCohortId, setOutcomeCohortId] = useState<number | null>(null);
  const [competingOutcomeCohortId, setCompetingOutcomeCohortId] = useState<number | null>(null);
  const [strata1CohortId, setStrata1CohortId] = useState<number | null>(null);
  const [strata2CohortId, setStrata2CohortId] = useState<number | null>(null);
  const [strata3CohortId, setStrata3CohortId] = useState<number | null>(null);
  const [analysisType, setAnalysisType] = useState<"single_event" | "competing_risk">("single_event");
  const { setFeedback } = useFeedback();

  const cohortMgmtClient = useMemo(() => new CohortSurvival(activeDataset.id), [activeDataset.id]);

  useEffect(() => {
    setIsLoading(true);
    const fetchData = async () => {
      try {
        const result = await cohortMgmtClient.getCohorts({ excludePatientIds: true });
        const cohortsForDataset = result.data.filter((res) => {
          try {
            if (!res.patientCount) {
              return false;
            }
            const cohortSyntax = JSON.parse(res.syntax);
            if (cohortSyntax.datasetId === activeDataset.id) {
              return true;
            }
            return false;
          } catch {
            return false;
          }
        });
        cohortsForDataset.sort((a, b) => Number(b.id) - Number(a.id));
        setCohortList(cohortsForDataset);
      } catch (err) {
        setFeedback({
          type: "error",
          message: getText(i18nKeys.COHORT_DEFINITION_LIST__ERROR_OCCURRED),
          description: getText(i18nKeys.COHORT_DEFINITION_LIST__TRY_AGAIN),
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [cohortMgmtClient, setFeedback, getText]);

  // Check if form is valid for submission
  const isFormValid = useMemo(() => {
    if (targetCohortId === null || outcomeCohortId === null) {
      return false;
    }

    if (analysisType === "competing_risk" && competingOutcomeCohortId === null) {
      return false;
    }

    return true;
  }, [targetCohortId, outcomeCohortId, competingOutcomeCohortId, analysisType]);

  const onClickRunAnalysis = useCallback(() => {
    if (!isFormValid) {
      return;
    }

    // If competing risk analysis is selected but no competing outcome cohort is selected
    if (analysisType === "competing_risk" && competingOutcomeCohortId === null) {
      setFeedback({
        type: "error",
        message: "Competing outcome cohort is required",
        description: "Please select a competing outcome cohort for competing risk analysis",
      });
      return;
    }

    setIsGraphLoading(true);

    const fetchGraphData = async (flowRunId: string) => {
      try {
        const { data } = await cohortMgmtClient.getKmAnalysisResults(flowRunId);
        const parsedData = JSON.parse(data) as GraphDataApi;

        // Initialize GraphData with empty arrays
        const newGraphData: GraphData = {
          timeX: [],
          survivalY: [],
        };

        // Extract data from the array of series
        // Find the main curve data (first object typically has the main curve data)
        const mainCurveData = parsedData[0];
        newGraphData.timeX = mainCurveData.x;
        newGraphData.survivalY = mainCurveData.y;

        // If there are facet variables (PANEL), use them
        // TODO: only use facet_var, but available only when strata is used
        if (mainCurveData.PANEL) {
          newGraphData.facetVar = mainCurveData.PANEL;
        }

        // Find confidence interval data (usually in an object with ymin and ymax)
        const confIntervalData = parsedData.find((item) => item.ymin !== undefined && item.ymax !== undefined);
        if (confIntervalData) {
          newGraphData.confidenceLowerY = confIntervalData.ymin;
          newGraphData.confidenceUpperY = confIntervalData.ymax;
        }

        setGraphData(newGraphData);
      } catch (err) {
        setGraphData(null);
        setFeedback({
          type: "error",
          message: getText(i18nKeys.COHORT_SURVIVAL__ERROR_OCCURRED),
          description: getText(i18nKeys.COHORT_SURVIVAL__TRY_AGAIN),
        });
      } finally {
        setIsGraphLoading(false);
      }
    };

    const fetchData = async () => {
      try {
        // We can safely use non-null assertion (!) here because isFormValid ensures these values are not null
        const strata1 =
          strata1CohortId !== null
            ? { id: strata1CohortId, name: cohortList.find((c) => Number(c.id) === strata1CohortId)?.name || "" }
            : undefined;

        const strata2 =
          strata2CohortId !== null
            ? { id: strata2CohortId, name: cohortList.find((c) => Number(c.id) === strata2CohortId)?.name || "" }
            : undefined;

        const strata3 =
          strata3CohortId !== null
            ? { id: strata3CohortId, name: cohortList.find((c) => Number(c.id) === strata3CohortId)?.name || "" }
            : undefined;

        const result: { flowRunId: string } = await cohortMgmtClient.startKmAnalysis({
          targetCohortId: targetCohortId!,
          outcomeCohortId: outcomeCohortId!,
          competingOutcomeCohortId:
            analysisType === "competing_risk" && competingOutcomeCohortId !== null
              ? competingOutcomeCohortId
              : undefined,
          analysisType,
          strata1,
          strata2,
          strata3,
        });
        await fetchGraphData(result.flowRunId);
      } catch (err) {
        setFeedback({
          type: "error",
          message: getText(i18nKeys.COHORT_DEFINITION_LIST__ERROR_OCCURRED),
          description: getText(i18nKeys.COHORT_DEFINITION_LIST__TRY_AGAIN),
        });
        setIsGraphLoading(false);
      }
    };
    fetchData();
  }, [
    cohortMgmtClient,
    setFeedback,
    getText,
    targetCohortId,
    outcomeCohortId,
    competingOutcomeCohortId,
    strata1CohortId,
    strata2CohortId,
    strata3CohortId,
    analysisType,
    cohortList,
  ]);

  const option = useMemo(() => {
    if (!graphData) {
      return null;
    }
    const outcomeCohort = cohortList.find((cohort) => Number(cohort.id) == outcomeCohortId);
    const competingOutcomeCohort = cohortList.find((cohort) => Number(cohort.id) == competingOutcomeCohortId);
    return getKaplanMeierGraphOption(graphData, outcomeCohort!, competingOutcomeCohort);
  }, [cohortList, graphData, outcomeCohortId, competingOutcomeCohortId]);
  console.log("option", option);
  return (
    <Card className="kaplan_meier__container">
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", fontSize: 20 }}>
        <div>{getText(i18nKeys.COHORT_SURVIVAL__TITLE)}</div>
      </div>
      <div style={{ display: "flex", marginTop: "30px" }}>
        <div className="kaplan_meier__cohort_selector">
          <div className="kaplan_meier__cohort_selector_label">
            {getText(i18nKeys.COHORT_SURVIVAL__SELECT_TARGET_COHORT)}:{" "}
          </div>
          <CohortSelector
            cohortTableName="Target cohort"
            setCohortId={setTargetCohortId}
            cohortId={targetCohortId}
            cohortList={cohortList}
            disabled={isLoading || isGraphLoading}
          />
        </div>
        <div className="kaplan_meier__cohort_selector">
          <div className="kaplan_meier__cohort_selector_label">
            {getText(i18nKeys.COHORT_SURVIVAL__SELECT_OUTCOME_COHORT)}:{" "}
          </div>
          <CohortSelector
            cohortTableName="Outcome cohort"
            setCohortId={setOutcomeCohortId}
            cohortId={outcomeCohortId}
            cohortList={cohortList}
            disabled={isLoading || isGraphLoading}
          />
        </div>
        <div className="kaplan_meier__cohort_selector">
          <div className="kaplan_meier__cohort_selector_label">
            {getText(i18nKeys.COHORT_SURVIVAL__SELECT_COMPETING_OUTCOME_COHORT)}:{" "}
          </div>
          <CohortSelector
            cohortTableName="Competing Outcome cohort"
            setCohortId={setCompetingOutcomeCohortId}
            cohortId={competingOutcomeCohortId}
            cohortList={cohortList}
            disabled={isLoading || isGraphLoading || analysisType === "single_event"}
            allowClear={true}
          />
        </div>
      </div>

      <div style={{ display: "flex", marginTop: "20px" }}>
        <div className="kaplan_meier__cohort_selector">
          <div className="kaplan_meier__cohort_selector_label">Strata 1:</div>
          <CohortSelector
            cohortTableName="Strata 1"
            setCohortId={setStrata1CohortId}
            cohortId={strata1CohortId}
            cohortList={cohortList}
            disabled={isLoading || isGraphLoading}
            allowClear={true}
          />
        </div>
        <div className="kaplan_meier__cohort_selector">
          <div className="kaplan_meier__cohort_selector_label">Strata 2:</div>
          <CohortSelector
            cohortTableName="Strata 2"
            setCohortId={setStrata2CohortId}
            cohortId={strata2CohortId}
            cohortList={cohortList}
            disabled={isLoading || isGraphLoading}
            allowClear={true}
          />
        </div>
        <div className="kaplan_meier__cohort_selector">
          <div className="kaplan_meier__cohort_selector_label">Strata 3:</div>
          <CohortSelector
            cohortTableName="Strata 3"
            setCohortId={setStrata3CohortId}
            cohortId={strata3CohortId}
            cohortList={cohortList}
            disabled={isLoading || isGraphLoading}
            allowClear={true}
          />
        </div>
      </div>

      <div className="kaplan_meier__analysis_type">
        <div style={{ marginRight: "20px" }}>
          <input
            type="radio"
            name="analysisType"
            value="single_event"
            checked={analysisType === "single_event"}
            onChange={() => {
              setAnalysisType("single_event");
              setCompetingOutcomeCohortId(null);
            }}
            disabled={isLoading || isGraphLoading}
          />
          {" Single Event Analysis"}
        </div>
        <div>
          <input
            type="radio"
            name="analysisType"
            value="competing_risk"
            checked={analysisType === "competing_risk"}
            onChange={() => setAnalysisType("competing_risk")}
            disabled={isLoading || isGraphLoading}
          />
          {" Competing Risk Analysis"}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: "10px" }}>
        <Button
          text={getText(i18nKeys.COHORT_SURVIVAL__RUN_SURVIVAL_ANALYSIS)}
          onClick={onClickRunAnalysis}
          disabled={isGraphLoading || !isFormValid}
        />
      </div>
      <div style={{ height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
        {isGraphLoading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <Loader text={getText(i18nKeys.COHORT_SURVIVAL__GRAPH_LOADING)} />
          </div>
        ) : graphData ? (
          <ReactECharts option={option} style={{ width: "100%", height: "600px" }} />
        ) : null}
      </div>
    </Card>
  );
};

export default KaplanMeier;
