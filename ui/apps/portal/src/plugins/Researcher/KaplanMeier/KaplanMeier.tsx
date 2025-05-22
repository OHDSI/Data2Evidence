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
import { GraphData, GraphDataApi } from "./utils/types";
import { getKaplanMeierGraphOption } from "./utils/helpers";

export interface TerminologyProps extends PageProps<ResearcherStudyMetadata> {}

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
  }, [cohortMgmtClient, setFeedback, getText, activeDataset.id]);

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
          strataName: [],
          strataLevel: [],
          confidenceLowerY: [],
          confidenceUpperY: [],
        };

        // Extract data from the API response using the GraphDataApi structure
        newGraphData.timeX = parsedData.time;
        newGraphData.survivalY = parsedData.estimate;

        // Add confidence intervals if available
        if (parsedData.estimate_95CI_lower && parsedData.estimate_95CI_upper) {
          newGraphData.confidenceLowerY = parsedData.estimate_95CI_lower;
          newGraphData.confidenceUpperY = parsedData.estimate_95CI_upper;
        }

        // Add facet variables if available
        if (parsedData.strata_name) {
          newGraphData.strataName = parsedData.strata_name;
          newGraphData.strataLevel = parsedData.strata_level;
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
    isFormValid,
  ]);

  const option = useMemo(() => {
    if (!graphData) {
      return null;
    }
    return getKaplanMeierGraphOption(graphData, analysisType === "competing_risk");
  }, [graphData, analysisType]);

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
              setGraphData(null); // Clear existing graph data
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
            onChange={() => {
              setAnalysisType("competing_risk");
              // Clear all strata selections when switching to competing risk
              setStrata1CohortId(null);
              setStrata2CohortId(null);
              setStrata3CohortId(null);
              setGraphData(null); // Clear existing graph data
            }}
            disabled={isLoading || isGraphLoading}
          />
          {" Competing Risk Analysis"}
        </div>
      </div>

      {analysisType === "single_event" && (
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
      )}

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
          <ReactECharts option={option} style={{ width: "100%", height: "375px" }} />
        ) : null}
      </div>
    </Card>
  );
};

export default KaplanMeier;
