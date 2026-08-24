import MailOutline from "@mui/icons-material/MailOutline";
import { CircularProgress } from "@mui/material";
import { Button, Card, RunStudyIcon, TrashIcon, EditIcon } from "@portal/components";
import React, { FC, useCallback, useState } from "react";
import { api } from "../../../../axios/api";
import { HighlightText } from "../../../../components";
import { useTranslation } from "../../../../contexts";
import { i18nKeys } from "../../../../contexts/app-context/states";
import { StrategusStudy, StrategusStudyType } from "../../../../types/strategusStudy";
import { useDialogHelper } from "../../../../hooks";
import StudyTemplateDialog from "../StudyTemplateDialog/StudyTemplateDialog";
import "./StudyCard.scss";

interface StudyCardProps {
  study: StrategusStudy;
  highlightText?: string;
  selectedDatasetId?: string;
  setFeedback: (feedback: any) => void;
  onDownloadResults?: (study: StrategusStudy) => void;
  onShareResults?: (study: StrategusStudy) => void;
  onUpdateStudyViewerCode?: (studyId: string, code: string) => void;
}

export const StudyCard: FC<StudyCardProps> = ({
  study,
  highlightText,
  selectedDatasetId,
  setFeedback,
  onUpdateStudyViewerCode,
}) => {
  const { getText } = useTranslation();
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [viewerCode, setViewerCode] = useState(study.viewerCode);
  const [isCleaningUp, setIsCleaningUp] = useState<boolean>(false);
  const [showStudyTemplateDialog, openStudyTemplateDialog, closeStudyTemplateDialog] = useDialogHelper(false);

  const handleRunStudy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();

      if (isRunning || !selectedDatasetId || !study.tokenDatasetCode) {
        return;
      }

      setIsRunning(true);

      try {
        let strategusJson;
        try {
          if (study.type == StrategusStudyType.NETWORK) {
            strategusJson = await api.systemPortal.getStudyStrategusJson(study.id!);
            // backend returns object, convert to string
            strategusJson = JSON.stringify(strategusJson);
          } else {
            const strategusAnalysis = await api.strategusAnalysis.getStrategusAnalysis(study.id);
            strategusJson = strategusAnalysis.analysisSpec;
          }
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
            analysisSpecification: strategusJson,
          },
          options: {
            mode: "kernel",
            datasetId: selectedDatasetId,
            tokenStudyCode: study.tokenDatasetCode,
            uploadResults: true,
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
        setIsRunning(false);
      }
    },
    [selectedDatasetId, setFeedback, study]
  );

  const handleCleanupStudy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();

      if (isCleaningUp || !study.tokenDatasetCode) {
        return;
      }

      setIsCleaningUp(true);

      try {
        await api.dataflow.createCleanUpStudySchemaRun(study.tokenDatasetCode);

        setFeedback({
          type: "success",
          message: getText(i18nKeys.STUDY_CARD__SUCCESS_STUDY_CLEANUP, [study.name || study.id || "Unknown"]),
          autoClose: 5000,
        });
      } catch (error) {
        console.error(`[${study.id}] Error cleaning up study:`, error);
        setFeedback({
          type: "error",
          message: getText(i18nKeys.STUDY_CARD__ERROR_CLEANUP_STUDY, [study.name || study.id || "Unknown"]),
          autoClose: 5000,
        });
      } finally {
        setIsCleaningUp(false);
      }
    },
    [setFeedback, study, isCleaningUp, getText]
  );

  const handleCodeSave = useCallback(
    async (newCode: string) => {
      if (typeof onUpdateStudyViewerCode === "function" && study.id) {
        onUpdateStudyViewerCode(study.id, newCode);
      }
    },
    [onUpdateStudyViewerCode, study.id]
  );

  return (
    <>
      <Card className="study-card" borderRadius={18}>
        <div className="study-card__content">
          <div className="study-card__header">
            <div className="study-card__title">
              <HighlightText
                text={(study.id || getText(i18nKeys.STUDY_CARD__UNTITLED)).replace(/_/g, " ")}
                searchText={highlightText}
              />
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
              text={study.description || getText(i18nKeys.STUDY_CARD__NO_STUDY_SUMMARY)}
              searchText={highlightText}
            />
          </div>

          <div className="study-card__actions">
            <Button
              onClick={handleRunStudy}
              startIcon={
                isRunning ? (
                  <CircularProgress size={16} className="study-card__action-icon study-card__loading-icon" />
                ) : (
                  <RunStudyIcon className="study-card__action-icon" />
                )
              }
              text={isRunning ? getText(i18nKeys.STUDY_CARD__RUNNING) : getText(i18nKeys.STUDY_CARD__RUN_STUDY)}
              disabled={!selectedDatasetId}
              variant="text"
            />

            <Button
              onClick={openStudyTemplateDialog}
              startIcon={<EditIcon className="study-card__action-icon" />}
              text={getText(i18nKeys.STUDY_CARD__EDIT_VIEWER)}
              disabled={!selectedDatasetId}
              variant="text"
              sx={{
                "&.Mui-disabled .MuiButton-startIcon path": {
                  fill: "grey",
                },
              }}
            />

            <Button
              onClick={handleCleanupStudy}
              startIcon={
                isCleaningUp ? (
                  <CircularProgress size={16} className="study-card__action-icon study-card__loading-icon" />
                ) : (
                  <TrashIcon className="study-card__action-icon" />
                )
              }
              text={
                isCleaningUp ? getText(i18nKeys.STUDY_CARD__CLEANING_UP) : getText(i18nKeys.STUDY_CARD__CLEANUP_STUDY)
              }
              disabled={isCleaningUp}
              variant="text"
            />
          </div>
        </div>
      </Card>

      <StudyTemplateDialog
        study={study}
        open={showStudyTemplateDialog}
        onClose={closeStudyTemplateDialog}
        code={viewerCode}
        onCodeChange={setViewerCode}
        onSave={handleCodeSave}
      />
    </>
  );
};
