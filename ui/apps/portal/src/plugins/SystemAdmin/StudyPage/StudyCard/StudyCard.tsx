import MailOutline from "@mui/icons-material/MailOutline";
import { Card, DownloadStudyIcon, RunStudyIcon, ShareStudyIcon } from "@portal/components";
import React, { FC, useCallback } from "react";
import { HighlightText } from "../../../../components";
import { useTranslation } from "../../../../contexts";
import { Study } from "../../../../types";
import "./StudyCard.scss";

interface StudyCardProps {
  study: Study;
  highlightText?: string;
  onRunStudy?: (study: Study) => void;
  onDownloadResults?: (study: Study) => void;
  onUserResults?: (study: Study) => void;
  onShareResults?: (study: Study) => void;
}

export const StudyCard: FC<StudyCardProps> = ({
  study,
  highlightText,
  onRunStudy,
  onDownloadResults,
  onUserResults,
  onShareResults,
}) => {
  const { getText, i18nKeys } = useTranslation();

  const handleRunStudy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRunStudy?.(study);
    },
    [onRunStudy, study]
  );

  const handleDownloadResults = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDownloadResults?.(study);
    },
    [onDownloadResults, study]
  );

  const handleUserResults = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onUserResults?.(study);
    },
    [onUserResults, study]
  );

  const handleShareResults = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onShareResults?.(study);
    },
    [onShareResults, study]
  );

  const contactEmail = "Eric@research.org"; // TODO: Read from json

  return (
    <Card className="study-card" borderRadius={18}>
      <div className="study-card__content">
        <div className="study-card__header">
          <div className="study-card__title">
            <HighlightText text={study.studyDetail?.name || "Untitled"} searchText={highlightText} />
          </div>
          <div className="study-card__contact">
            <MailOutline className="study-card__contact-icon" />
            {contactEmail}
          </div>
        </div>

        <div className="study-card__summary">
          <HighlightText text={study.studyDetail?.summary || "No study summary available"} searchText={highlightText} />
        </div>

        <div className="study-card__actions">
          <div className="study-card__action" onClick={handleRunStudy}>
            <RunStudyIcon className="study-card__action-icon" />
            <span>Run study</span>
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
