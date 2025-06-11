import MailOutline from "@mui/icons-material/MailOutline";
import { CircularProgress } from "@mui/material";
import { Card, DownloadStudyIcon, RunStudyIcon, ShareStudyIcon } from "@portal/components";
import React, { FC, useCallback } from "react";
import { HighlightText } from "../../../../components";
import { useTranslation } from "../../../../contexts";
import { StrategusStudy } from "../../../../types/strategusStudy";
import "./StudyCard.scss";

interface StudyCardProps {
  study: StrategusStudy;
  highlightText?: string;
  isRunning?: boolean;
  onRunStudy?: (study: StrategusStudy) => void;
  onDownloadResults?: (study: StrategusStudy) => void;
  onShareResults?: (study: StrategusStudy) => void;
}

export const StudyCard: FC<StudyCardProps> = ({
  study,
  highlightText,
  isRunning = false,
  onRunStudy,
  onDownloadResults,
  onShareResults,
}) => {
  const { getText, i18nKeys } = useTranslation();

  const handleRunStudy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isRunning) {
        onRunStudy?.(study);
      }
    },
    [onRunStudy, study, isRunning]
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
