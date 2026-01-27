import React, { FC, useCallback, useState, useEffect, useMemo } from "react";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import { PlayCircleFilled, StopCircle } from "@mui/icons-material";
import { Button, Dialog, Select, MenuItem, InputLabel } from "@portal/components";
import * as monaco from "monaco-editor";
import { loader, Editor } from "@monaco-editor/react";
import { Study, CloseDialogType, StudyDashboardTemplateData, Feedback, NetworkStrategusStudy } from "../../../../types";
import { useKernelViewer } from "../../../../hooks";
import { useTranslation } from "../../../../contexts";
import { api } from "../../../../axios/api";
import "./ManageViewerDialog.scss";
import { i18nKeys } from "../../../../contexts/app-context/states";

interface ViewerConfig {
  type: "dashboard" | "strategus";
  id: string; // datasetId or studyId
  name: string;
}

interface ManageViewerDialogProps {
  config: ViewerConfig;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

interface ViewerOperations {
  fetchTemplates: () => Promise<StudyDashboardTemplateData[]>;
  fetchCode: (id: string) => Promise<string>;
  saveCode: (id: string, code: string) => Promise<void>;
}

const SafeEditor = Editor as any;

const enum ViewerType {
  SHINY_SERVER = "shiny-server",
  R = "r",
  Python = "python",
}

const ManageViewerDialog: FC<ManageViewerDialogProps> = ({ config, open, onClose }) => {
  loader.config({ monaco });
  const { getText } = useTranslation();
  const [viewerCode, setViewerCode] = useState<string>("");
  const [defaultViewerCode, setDefaultViewerCode] = useState<string>("");
  const [templates, setTemplates] = useState<StudyDashboardTemplateData[]>([]);
  const [templateLanguage, setTemplateLanguage] = useState<ViewerType>(ViewerType.SHINY_SERVER);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("default");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({});

  const [viewerStatus, startViewer, stopViewer] = useKernelViewer(config.id, config.id);

  const viewerTypes = useMemo(
    () => [
      { label: "R Shiny Server", value: ViewerType.SHINY_SERVER },
      { label: "R", value: ViewerType.R },
      { label: "Python", value: ViewerType.Python },
    ],
    []
  );

  const editorLanguage = useMemo(() => {
    return templateLanguage === ViewerType.Python ? "python" : "r";
  }, [templateLanguage]);

  const operations = useMemo((): ViewerOperations => {
    if (config.type === "dashboard") {
      return {
        fetchTemplates: () => api.systemPortal.getDashboardTemplatesFromRepo(),
        fetchCode: async (id: string) => {
          const result = await api.systemPortal.getDashboardCode(id, "dashboard");
          return result.code;
        },
        saveCode: async (id: string, code: string) => {
          await api.systemPortal.upsertDashboardCode({
            datasetId: id,
            code,
            type: "dashboard",
          });
        },
      };
    } else {
      // strategus
      return {
        fetchTemplates: () => api.strategusAnalysis.getStudyViewerTemplates(),
        fetchCode: async (id: string) => {
          const study = await api.strategusAnalysis.getStrategusAnalysis(id);
          return study.viewerCode || "";
        },
        saveCode: (id: string, code: string) => api.strategusAnalysis.saveStategusAnalysisViewerCode(id, code),
      };
    }
  }, [config.type]);

  const getI18nKeys = useCallback(() => {
    const prefix = config.type === "dashboard" ? "MANAGE_DASHBOARD_DIALOG" : "MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG";

    return {
      title: `${prefix}__TITLE` as keyof typeof i18nKeys,
      startViewer: `${prefix}__START_VIEWER` as keyof typeof i18nKeys,
      startingViewer: `${prefix}__STARTING_VIEWER` as keyof typeof i18nKeys,
      stopViewer: `${prefix}__STOP_VIEWER` as keyof typeof i18nKeys,
      stoppingViewer: `${prefix}__STOPPING_VIEWER` as keyof typeof i18nKeys,
      viewerStatus: `${prefix}__VIEWER_STATUS` as keyof typeof i18nKeys,
      cancel: `${prefix}__CANCEL` as keyof typeof i18nKeys,
      save: `${prefix}__SAVE` as keyof typeof i18nKeys,
      saveSuccess: `${prefix}__SAVE_SUCCESS` as keyof typeof i18nKeys,
      saveError: `${prefix}__SAVE_ERROR` as keyof typeof i18nKeys,
    };
  }, [config.type]);

  const i18n = getI18nKeys();

  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      try {
        const templates = await operations.fetchTemplates();
        setTemplates(templates);
      } catch (error) {
        console.error("Failed to fetch templates:", error);
        setTemplates([]);
      }

      try {
        const code = await operations.fetchCode(config.id);
        setViewerCode(code);
        setDefaultViewerCode(code);
      } catch (error) {
        console.error("Failed to fetch default viewer code:", error);
        setDefaultViewerCode("");
        setViewerCode("");
      }
    };

    fetchData();
  }, [open, config.id, config.type, operations]);

  const handleStartViewer = useCallback(async () => {
    try {
      await startViewer(viewerCode);
    } catch (error) {
      console.error("Failed to start viewer:", error);
    }
  }, [startViewer, viewerCode]);

  const handleStopViewer = useCallback(async () => {
    try {
      await stopViewer();
    } catch (error) {
      console.error("Failed to stop viewer:", error);
    }
  }, [stopViewer]);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleSave = useCallback(async () => {
    setFeedback({});
    try {
      setLoading(true);
      await operations.saveCode(config.id, viewerCode);
      setFeedback({
        type: "success",
        message: getText(i18n.saveSuccess),
      });
      setDefaultViewerCode(viewerCode);
      setSelectedTemplate("default");
    } catch (error) {
      console.error("Failed to save code:", error);
      setFeedback({
        type: "error",
        message: getText(i18n.saveError, [config.name]),
      });
    } finally {
      setLoading(false);
    }
  }, [viewerCode, config.id, config.name, getText, operations, i18n]);

  const handleBuildAssets = useCallback(async () => {
    setFeedback({});
    try {
      setLoading(true);
      await api.dataflow.triggerShinyLiveAssetDeployment({
        datasetId: config.id,
        language: templateLanguage,
        appCode: viewerCode,
      });
      setFeedback({
        type: "success",
        message: "Shiny assets build triggered successfully.",
      });
    } catch (error) {
      console.error("Failed to trigger shiny assets build:", error);
      setFeedback({
        type: "error",
        message: "Failed to trigger shiny assets build.",
      });
    } finally {
      setLoading(false);
    }
  }, [viewerCode, templateLanguage]);

  const handleTemplateChange = useCallback(
    (filename: string) => {
      setSelectedTemplate(filename);
      if (filename === "default") {
        setViewerCode(defaultViewerCode);
      } else {
        const tmpl = templates.find((t) => t.filename === filename);
        if (tmpl?.content) {
          setViewerCode(tmpl.content);
        }
      }
    },
    [defaultViewerCode, templates]
  );

  const clearFeedback = useCallback(() => {
    setFeedback({});
  }, []);

  const dialogClassName = `manage-viewer-dialog manage-viewer-dialog--${config.type}`;

  return (
    <Dialog
      className={dialogClassName}
      title={getText(i18n.title, [config.name])}
      closable
      fullWidth
      maxWidth="lg"
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
      onCloseFeedback={clearFeedback}
    >
      <Divider />

      <div className="manage-viewer-dialog__header">
        <div className="manage-viewer-dialog__header__selection">
          <div>
            <InputLabel sx={{ mb: 1 }}>Template</InputLabel>
            <Select
              sx={{ width: "100%" }}
              variant="standard"
              value={selectedTemplate}
              onChange={(event) => handleTemplateChange(event.target.value)}
            >
              <MenuItem value="default">
                <em>Default</em>
              </MenuItem>
              {templates.map((template) => (
                <MenuItem key={template.filename} value={template.filename}>
                  {template?.filename}
                </MenuItem>
              ))}
            </Select>
          </div>
          <div>
            <InputLabel sx={{ mb: 1 }}>Viewer Type</InputLabel>
            <Select
              sx={{ width: "100%" }}
              variant="standard"
              value={templateLanguage}
              onChange={(event) => setTemplateLanguage(event.target.value as ViewerType)}
            >
              {viewerTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </div>
        </div>

        {ViewerType.SHINY_SERVER === templateLanguage && (
          <>
            <div className="manage-viewer-dialog__header__content">
              <Button
                onClick={handleStartViewer}
                startIcon={
                  viewerStatus === "starting" ? (
                    <CircularProgress size={16} className="manage-viewer-dialog__loading-icon" />
                  ) : (
                    <PlayCircleFilled className="manage-viewer-dialog__action-icon" />
                  )
                }
                text={viewerStatus === "starting" ? getText(i18n.startingViewer) : getText(i18n.startViewer)}
                disabled={viewerStatus !== "down" && viewerStatus !== "failed"}
                variant="text"
              />

              <Button
                startIcon={
                  viewerStatus === "stopping" ? (
                    <CircularProgress size={16} className="manage-viewer-dialog__loading-icon" />
                  ) : (
                    <StopCircle className="manage-viewer-dialog__action-icon" />
                  )
                }
                text={viewerStatus === "stopping" ? getText(i18n.stoppingViewer) : getText(i18n.stopViewer)}
                disabled={viewerStatus !== "up"}
                variant="text"
                onClick={handleStopViewer}
              />
            </div>
            <div className="manage-viewer-dialog__header__content">{getText(i18n.viewerStatus, [viewerStatus])}</div>
          </>
        )}

        {ViewerType.SHINY_SERVER !== templateLanguage && (
          <div className="manage-viewer-dialog__header__content">
            <Button onClick={handleBuildAssets} text="Build Shiny Assets" loading={loading} />
          </div>
        )}
      </div>
      <Divider />

      <div className="manage-viewer-dialog__content">
        <SafeEditor
          height="70vh"
          language={editorLanguage}
          value={viewerCode}
          options={{
            scrollBeyondLastLine: false,
            fontSize: "14px",
          }}
          onChange={setViewerCode}
        />
      </div>
      <Divider />

      <div className="button-group-actions">
        <Button text={getText(i18n.cancel)} onClick={() => handleClose("cancelled")} variant="outlined" block />
        <Button text={getText(i18n.save)} onClick={handleSave} block loading={loading} />
      </div>
    </Dialog>
  );
};

export default ManageViewerDialog;
