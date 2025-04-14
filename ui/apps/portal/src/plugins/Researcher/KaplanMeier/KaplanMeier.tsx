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

// Transform the data for step plot and confidence intervals
type GraphData = { timeX: number[]; survivalY: number[] };
const getKaplanMeierGraphOption = (data: GraphData | null) => {
  const _data = data || { timeX: [], survivalY: [] };
  const times = [];
  const survivals: number[] = [];
  for (let i = 0; i < _data.survivalY.length; i++) {
    times.push(_data.timeX[i]);
    survivals.push(_data.survivalY[i]);
    if (i < _data.survivalY.length - 1) {
      times.push(_data.timeX[i + 1]);
      survivals.push(_data.survivalY[i]);
    }
  }
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
      text: "Kaplan-Meier Survival Curve",
    },
    xAxis: {
      type: "value",
      name: "Days",
    },
    yAxis: {
      type: "value",
      name: "Survival Probability",
    },
    tooltip: {
      trigger: "axis",
      formatter: function (params: any) {
        let result = "Days: " + Math.floor(params[0].axisValueLabel) + "<br>";
        let probability = 1;
        let marker = "";
        let seriesName = "";
        params.forEach(function (item: any) {
          if (item.seriesName === "Survival Probability") {
            if (item.data[1] < probability) {
              probability = item.data[1];
            }
            marker = item.marker;
            seriesName = item.seriesName;
          }
        });
        result += marker + seriesName + ": " + probability;
        return result;
      },
    },
    series: [
      {
        name: "Survival Probability",
        data: times.map((time, index) => [time, survivals[index]]),
        type: "line",
        step: "end",
        smooth: true,
        lineStyle: {
          color: "black",
        },
      },
    ],
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
        const { result } = await cohortMgmtClient.getKmAnalysisResults(flowRunId);
        const parsedData = JSON.parse(result);
        if (parsedData.status === "SUCCESS") {
          const newGraphData = { timeX: parsedData.x, survivalY: parsedData.y };
          setGraphData(newGraphData);
        } else {
          setGraphData(null);
          setFeedback({
            type: "error",
            message: getText(i18nKeys.COHORT_SURVIVAL__ERROR_OCCURRED),
            description: getText(i18nKeys.COHORT_SURVIVAL__TRY_AGAIN),
          });
        }
      } catch (err) {
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
        const result: { flowRunId: string } = await cohortMgmtClient.startKmAnalysis({
          targetCohortId: targetCohortId!,
          outcomeCohortId: outcomeCohortId!,
          competingOutcomeCohortId:
            analysisType === "competing_risk" && competingOutcomeCohortId !== null
              ? competingOutcomeCohortId
              : undefined,
          analysisType,
        });
        const graphData = await fetchGraphData(result.flowRunId);
        console.log(graphData);
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
  }, [cohortMgmtClient, setFeedback, getText, targetCohortId, outcomeCohortId, competingOutcomeCohortId, analysisType]);

  const option = useMemo(() => {
    return getKaplanMeierGraphOption(graphData);
  }, [graphData]);

  return (
    <Card className="kaplan_meier__container">
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", fontSize: 20 }}>
        <div>{getText(i18nKeys.COHORT_SURVIVAL__TITLE)}</div>
      </div>
      <div style={{ display: "flex", marginTop: "30px" }}>
        <div>
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
        </div>
        <div>
          <div className="kaplan_meier__cohort_selector">
            <div className="kaplan_meier__cohort_selector_label" style={{ marginLeft: "10px" }}>
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
        </div>
        <div>
          <div className="kaplan_meier__cohort_selector">
            <div className="kaplan_meier__cohort_selector_label" style={{ marginLeft: "10px" }}>
              {getText(i18nKeys.COHORT_SURVIVAL__SELECT_COMPETING_OUTCOME_COHORT)}:{" "}
            </div>
            <CohortSelector
              cohortTableName="Competing Outcome cohort"
              setCohortId={setCompetingOutcomeCohortId}
              cohortId={competingOutcomeCohortId}
              cohortList={cohortList}
              disabled={isLoading || isGraphLoading || analysisType === "single_event"}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", marginTop: "15px", alignItems: "center" }}>
        <div style={{ marginRight: "20px" }}>
          <label>
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
          </label>
        </div>
        <div>
          <label>
            <input
              type="radio"
              name="analysisType"
              value="competing_risk"
              checked={analysisType === "competing_risk"}
              onChange={() => setAnalysisType("competing_risk")}
              disabled={isLoading || isGraphLoading}
            />
            {" Competing Risk Analysis"}
          </label>
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
          // <div>he</div>
          <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />
        ) : null}
      </div>
    </Card>
  );
};

export default KaplanMeier;
