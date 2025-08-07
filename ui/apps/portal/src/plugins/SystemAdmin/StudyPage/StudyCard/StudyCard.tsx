import { ArrowBack, OpenInBrowser, PlayCircleFilled } from "@mui/icons-material";
import MailOutline from "@mui/icons-material/MailOutline";
import { CircularProgress } from "@mui/material";
import { Button, Card, RunStudyIcon, TrashIcon } from "@portal/components";
import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../../axios/api";
import { HighlightText } from "../../../../components";
import { getAuthToken } from "../../../../containers/auth/auth";
import { useTranslation } from "../../../../contexts";
import env from "../../../../env";
import { usePollingEffect } from "../../../../hooks";
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

type ViewerStatus = "idle" | "starting" | "up" | "stopping" | "down";

export const StudyCard: FC<StudyCardProps> = ({ study, highlightText, selectedDatasetId, setFeedback }) => {
  const { getText, i18nKeys } = useTranslation();
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [bearerToken, setBearerToken] = useState<string>("");
  const [viewerStatus, setViewerStatus] = useState<ViewerStatus>("idle");
  const isViewerUp = viewerStatus === "up";
  const isStartingViewer = viewerStatus === "starting";
  const isStoppingViewer = viewerStatus === "stopping";
  const [isCleaningUp, setIsCleaningUp] = useState<boolean>(false);
  const [isIframeViewerOpen, setIsIframeViewerOpen] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const VIEWER_BASE_URL = `${env.REACT_APP_DN_BASE_URL}strategus-results/${study.id}/`;

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const token = await getAuthToken(false);
        if (token) {
          setBearerToken(token);
        }
      } catch (error) {
        console.error("Error fetching auth token:", error);
      }
    };

    fetchToken();
    fetchViewerStatus();
  }, []);

  useEffect(() => {
    if (isIframeViewerOpen && iframeRef.current && iframeRef.current.contentWindow && bearerToken) {
      try {
        iframeRef.current.contentWindow.document.cookie = `authtoken=${bearerToken}; path=/strategus-results; secure;`;
      } catch (error) {
        console.error("Error setting cookie in iframe:", error);
      }
    }
  }, [isIframeViewerOpen, bearerToken]);

  const fetchViewerStatus = useCallback(async () => {
    if (!study.id) {
      return;
    }
    const response = await api.strategusResults.getStrategusResultViewerStatus(study.id);
    if (response.running) {
      setViewerStatus("up");
    } else {
      setViewerStatus("down");
    }
  }, [study.id]);

  usePollingEffect(fetchViewerStatus, [fetchViewerStatus, selectedDatasetId, viewerStatus], {
    isEnabled: isStartingViewer || isStoppingViewer,
    intervalSeconds: 2.5,
  });

  const handleOpenIframeViewer = useCallback(() => {
    setIsIframeViewerOpen(true);
  }, []);

  const handleCloseIframeViewer = useCallback(() => {
    setIsIframeViewerOpen(false);
  }, []);

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
        setIsRunning(false);
      }
    },
    [selectedDatasetId, setFeedback, study]
  );

  const handleStartViewer = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!selectedDatasetId || !study.id) {
        return;
      }
      try {
        setViewerStatus("starting");
        await api.strategusResults.startStrategusResultViewer(study.id, selectedDatasetId);
        setFeedback({
          type: "success",
          message: getText(i18nKeys.STUDY_CARD__SUCCESS_VIEWER_STARTED, [study.name || study.id || "Unknown"]),
          autoClose: 5000,
        });
      } catch (error) {
        console.error(error);
        setFeedback({
          type: "error",
          message: getText(i18nKeys.STUDY_CARD__ERROR_START_VIEWER, [study.name || study.id || "Unknown"]),
          autoClose: 5000,
        });
        setViewerStatus("idle");
      }
    },
    [
      getText,
      selectedDatasetId,
      setFeedback,
      study,
      i18nKeys.STUDY_CARD__ERROR_START_VIEWER,
      i18nKeys.STUDY_CARD__SUCCESS_VIEWER_STARTED,
    ]
  );

  const handleStopViewer = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!selectedDatasetId || !study.id) {
        return;
      }
      try {
        setViewerStatus("stopping");
        await api.strategusResults.stopStrategusResultViewer(study.id);
        setFeedback({
          type: "success",
          message: getText(i18nKeys.STUDY_CARD__SUCCESS_VIEWER_STOPPED, [study.name || study.id || "Unknown"]),
          autoClose: 5000,
        });
      } catch (error) {
        console.error(error);
        setFeedback({
          type: "error",
          message: getText(i18nKeys.STUDY_CARD__ERROR_STOP_VIEWER, [study.name || study.id || "Unknown"]),
          autoClose: 5000,
        });
        setViewerStatus("idle");
      }
    },
    [
      getText,
      selectedDatasetId,
      setFeedback,
      study,
      i18nKeys.STUDY_CARD__SUCCESS_VIEWER_STOPPED,
      i18nKeys.STUDY_CARD__ERROR_STOP_VIEWER,
    ]
  );

  const handleCleanupStudy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();

      if (isCleaningUp || !selectedDatasetId || !study.id) {
        return;
      }

      setIsCleaningUp(true);

      try {
        await api.dataflow.createCleanUpStudySchemaRun(study.id, selectedDatasetId);

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
    [selectedDatasetId, setFeedback, study]
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
              disabled={selectedDatasetId ? false : true}
              variant="text"
            />

            {isViewerUp ? (
              <Button
                onClick={handleStopViewer}
                startIcon={
                  isStoppingViewer ? (
                    <CircularProgress size={16} className="study-card__action-icon study-card__loading-icon" />
                  ) : (
                    <PlayCircleFilled className="study-card__action-icon" />
                  )
                }
                text={
                  isStoppingViewer
                    ? getText(i18nKeys.STUDY_CARD__STOPPING_VIEWER)
                    : getText(i18nKeys.STUDY_CARD__STOP_VIEWER)
                }
                disabled={selectedDatasetId ? false : true}
                variant="text"
              />
            ) : (
              <Button
                onClick={handleStartViewer}
                startIcon={
                  isStartingViewer ? (
                    <CircularProgress size={16} className="study-card__action-icon study-card__loading-icon" />
                  ) : (
                    <PlayCircleFilled className="study-card__action-icon" />
                  )
                }
                text={
                  isStartingViewer
                    ? getText(i18nKeys.STUDY_CARD__STARTING_VIEWER)
                    : getText(i18nKeys.STUDY_CARD__START_VIEWER)
                }
                disabled={selectedDatasetId ? false : true}
                variant="text"
              />
            )}

            <Button
              onClick={handleOpenIframeViewer}
              startIcon={<OpenInBrowser className="study-card__action-icon" />}
              text="Open viewer"
              disabled={!isViewerUp || !selectedDatasetId}
              variant="text"
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
              disabled={selectedDatasetId ? false : true}
              variant="text"
            />
          </div>
        </div>
      </Card>

      {isIframeViewerOpen && (
        <div className="study-card__fullscreen-overlay">
          <div className="study-card__fullscreen-header">
            <button onClick={handleCloseIframeViewer} className="study-card__back-button">
              <ArrowBack className="study-card__back-icon" />
              <span>Back</span>
            </button>
            <span className="study-card__viewer-title">
              Results Viewer - {(study.name || study.id)?.replace(/_/g, " ")}
            </span>
          </div>
          <iframe
            ref={iframeRef}
            src={VIEWER_BASE_URL}
            title="Fullscreen Iframe Viewer"
            className="study-card__fullscreen-iframe"
          />
        </div>
      )}
    </>
  );
};
