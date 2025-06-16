import MailOutline from "@mui/icons-material/MailOutline";
import { CircularProgress } from "@mui/material";
import { Card, DownloadStudyIcon, RunStudyIcon, ShareStudyIcon } from "@portal/components";
import React, { FC, useCallback, useState } from "react";
import { api } from "../../../../axios/api";
import { HighlightText } from "../../../../components";
import { useTranslation } from "../../../../contexts";
import { StrategusStudy } from "../../../../types/strategusStudy";
import "./StudyCard.scss";

interface StudyCardProps {
  study: StrategusStudy;
  highlightText?: string;
  selectedDatasetId?: string;
  setFeedback: (feedback: any) => void;
  onDownloadResults?: (study: StrategusStudy) => void;
  onShareResults?: (study: StrategusStudy) => void;
}

export const StudyCard: FC<StudyCardProps> = ({
  study,
  highlightText,
  selectedDatasetId,
  setFeedback,
  onDownloadResults,
  onShareResults,
}) => {
  const { getText, i18nKeys } = useTranslation();
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const handleRunStudy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();

      if (isRunning || !selectedDatasetId) {
        return;
      }

      setIsRunning(true);

      try {
        let strategusJson;
        try {
          strategusJson = await api.systemPortal.getStudyStrategusJson(study.id!);
        } catch (error) {
          console.error(`[${study.id}] Could not fetch strategus JSON from repository:`, error);
          setFeedback({
            type: "error",
            message: "Could not fetch strategus JSON from repository",
            description: "Please check if the study configuration is available.",
            autoClose: 5000,
          });
          return;
        }

        const requestData = {
          json_graph: {
            analysisSpecification: JSON.stringify(strategusJson),
          },
          options: {
            mode: "kernel",
            datasetId: selectedDatasetId,
            studyId: study.id,
          },
        };

        console.log(`[${study.id}] Request data:`, {
          ...requestData,
          json_graph: {
            analysisSpecification: `[JSON with ${JSON.stringify(strategusJson).length} characters]`,
          },
        });
        console.log(`[${study.id}] Making API call to createStudyAnalysisRun...`);
        const response = await api.dataflow.createStudyAnalysisRun(requestData);
        console.log(`[${study.id}] API call successful:`, response);

        setFeedback({
          type: "success",
          message: `Study "${study.name || study.id}" started successfully`,
          description: `Flow run ID: ${response.flowrunId || response.flowRunId}`,
          autoClose: 5000,
        });
      } catch (error) {
        console.error(`[${study.id}] Error running study:`, error);
        setFeedback({
          type: "error",
          message: `Failed to start study "${study.name || study.id}"`,
          autoClose: 5000,
        });
      } finally {
        console.log(`[${study.id}] Setting isRunning to false`);
        setIsRunning(false);
      }
    },
    [selectedDatasetId, setFeedback, study]
  );

  const handleDownloadResults = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDownloadResults?.(study);
    },
    [onDownloadResults, study]
  );

  const handleShareResults = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onShareResults?.(study);
    },
    [onShareResults, study]
  );

  return (
    <Card className="study-card" borderRadius={18}>
      <div className="study-card__content">
        <div className="study-card__header">
          <div className="study-card__title">
            <HighlightText text={study.id || "Untitled"} searchText={highlightText} />
          </div>
          <div className="study-card__contact">
            <MailOutline className="study-card__contact-icon" />
            {study.email}
          </div>
        </div>

        <div className="study-card__summary">
          <HighlightText text={study.description || "No study summary available"} searchText={highlightText} />
        </div>

        <div className="study-card__actions">
          <div
            className={`study-card__action ${isRunning ? "study-card__action--loading" : ""}`}
            onClick={handleRunStudy}
          >
            {isRunning ? (
              <>
                <CircularProgress size={16} className="study-card__action-icon study-card__loading-icon" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <RunStudyIcon className="study-card__action-icon" />
                <span>Run study</span>
              </>
            )}
          </div>
          <div className="study-card__action" onClick={handleDownloadResults}>
            <DownloadStudyIcon className="study-card__action-icon" />
            <span>Download results</span>
          </div>
          <div className="study-card__action" onClick={handleShareResults}>
            <ShareStudyIcon className="study-card__action-icon" />
            <span>Share results</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
