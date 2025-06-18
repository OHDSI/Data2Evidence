import MailOutline from "@mui/icons-material/MailOutline";
import { CircularProgress } from "@mui/material";
import { Card, RunStudyIcon } from "@portal/components";
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

export const StudyCard: FC<StudyCardProps> = ({ study, highlightText, selectedDatasetId, setFeedback }) => {
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
            message: getText(i18nKeys.STUDY_CARD__ERROR_FETCH_STRATEGUS_JSON),
            description: getText(i18nKeys.STUDY_CARD__ERROR_FETCH_STRATEGUS_JSON_DESCRIPTION),
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
        const response = await api.dataflow.createStudyAnalysisRun(requestData);

        setFeedback({
          type: "success",
          message: getText(i18nKeys.STUDY_CARD__SUCCESS_STUDY_STARTED, [study.name || study.id || "Unknown"]),
          description: getText(i18nKeys.STUDY_CARD__SUCCESS_FLOW_RUN_ID, [
            response.flowrunId || response.flowRunId || "Unknown",
          ]),
          autoClose: 5000,
        });
      } catch (error) {
        console.error(`[${study.id}] Error running study:`, error);
        setFeedback({
          type: "error",
          message: getText(i18nKeys.STUDY_CARD__ERROR_START_STUDY, [study.name || study.id || "Unknown"]),
          autoClose: 5000,
        });
      } finally {
        console.log(`[${study.id}] Setting isRunning to false`);
        setIsRunning(false);
      }
    },
    [selectedDatasetId, setFeedback, study]
  );

  return (
    <Card className="study-card" borderRadius={18}>
      <div className="study-card__content">
        <div className="study-card__header">
          <div className="study-card__title">
            <HighlightText text={study.id || getText(i18nKeys.STUDY_CARD__UNTITLED)} searchText={highlightText} />
          </div>
          {study.email && (
            <div className="study-card__contact">
              <MailOutline className="study-card__contact-icon" />
              {study.email}
            </div>
          )}
        </div>

        <div className="study-card__summary">
          <HighlightText
            text={study.description || getText(i18nKeys.STUDY_CARD__NO_DATASET_SUMMARY)}
            searchText={highlightText}
          />
        </div>

        <div className="study-card__actions">
          <div
            className={`study-card__action ${isRunning ? "study-card__action--loading" : ""}`}
            onClick={handleRunStudy}
          >
            {isRunning ? (
              <>
                <CircularProgress size={16} className="study-card__action-icon study-card__loading-icon" />
                <span>{getText(i18nKeys.STUDY_CARD__RUNNING)}</span>
              </>
            ) : (
              <>
                <RunStudyIcon className="study-card__action-icon" />
                <span>{getText(i18nKeys.STUDY_CARD__RUN_STUDY)}</span>
              </>
            )}
          </div>
          {/* <div className="study-card__action" onClick={handleDownloadResults}>
            <DownloadStudyIcon className="study-card__action-icon" />
            <span>Download results</span>
          </div>
          <div className="study-card__action" onClick={handleShareResults}>
            <ShareStudyIcon className="study-card__action-icon" />
            <span>Share results</span>
          </div> */}
        </div>
      </div>
    </Card>
  );
};
