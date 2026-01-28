import React, { FC, useCallback, useState, useEffect, useMemo } from "react";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import { PlayCircleFilled, StopCircle } from "@mui/icons-material";
import { Button, Dialog, Select, MenuItem, InputLabel, TextField, Loader } from "@portal/components";
import * as monaco from "monaco-editor";
import { loader, Editor } from "@monaco-editor/react";
import {
  Study,
  CloseDialogType,
  StudyDashboardTemplateData,
  Feedback,
  NetworkStrategusStudy,
  ViewerCodeWithQueries,
} from "../../../../types";
import { useKernelViewer } from "../../../../hooks";
import { useTranslation } from "../../../../contexts";
import { api } from "../../../../axios/api";
import "./ManageViewerDialog.scss";
import { i18nKeys } from "../../../../contexts/app-context/states";

interface ViewerConfig {
  type: "dashboard" | "cohort" | "strategus";
  id: string; // datasetId or studyId
}

interface ManageViewerDialogProps {
  config: ViewerConfig;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

interface ViewerOperations {
  fetchTemplates: () => Promise<StudyDashboardTemplateData[]>;
  fetchCode: (id: string, name: string) => Promise<string>;
  saveCode: (id: string, code: string, name: string) => Promise<void>;
}

interface QueryEntry {
  queryName: string;
  sql: string;
}

const SafeEditor = Editor as any;

// Configure monaco loader at module level (not on every render)
loader.config({ monaco });

const enum ViewerType {
  SHINY_SERVER = "shiny-server",
  R = "r",
  Python = "python",
}

const ManageViewerDialog: FC<ManageViewerDialogProps> = ({ config, open, onClose }) => {
  const { getText } = useTranslation();
  const [viewerCode, setViewerCode] = useState<string>("");
  const [defaultViewerCode, setDefaultViewerCode] = useState<string>("");
  const [templates, setTemplates] = useState<StudyDashboardTemplateData[]>([]);
  const [templateLanguage, setTemplateLanguage] = useState<ViewerType>(ViewerType.SHINY_SERVER);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("default");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({});
  const [name, setName] = useState<string>("");
  const [queries, setQueries] = useState<QueryEntry[]>([]);
  const [configType, setConfigType] = useState<"dashboard" | "cohort">(
    config.type === "cohort" ? "cohort" : "dashboard"
  );
  const [savedCodes, setSavedCodes] = useState<ViewerCodeWithQueries[]>([]);
  const [isNewName, setIsNewName] = useState(false);
  const [newNameInput, setNewNameInput] = useState("");

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
        fetchCode: async (id: string, codeName: string) => {
          const result = await api.systemPortal.getDashboardCode(id, "dashboard", codeName);
          return result.code;
        },
        saveCode: async (id: string, code: string, codeName: string) => {
          await api.systemPortal.upsertDashboardCode({
            datasetId: id,
            code,
            type: "dashboard",
            name: codeName,
          });
        },
      };
    } else {
      // strategus
      return {
        fetchTemplates: () => api.strategusAnalysis.getStudyViewerTemplates(),
        fetchCode: async (id: string, _codeName: string) => {
          const study = await api.strategusAnalysis.getStrategusAnalysis(id);
          return study.viewerCode || "";
        },
        saveCode: (id: string, code: string, _codeName: string) =>
          api.strategusAnalysis.saveStategusAnalysisViewerCode(id, code),
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
      setInitialLoading(true);
      try {
        try {
          const templates = await operations.fetchTemplates();
          setTemplates(templates);
        } catch (error) {
          console.error("Failed to fetch templates:", error);
          setTemplates([]);
        }

        // For dashboard/cohort types, use dashboard-codes endpoint
        if (config.type === "dashboard" || config.type === "cohort") {
          setIsNewName(false);
          setNewNameInput("");
          try {
            const codes = await api.systemPortal.getDashboardCodes(config.id, configType);
            setSavedCodes(codes);
            if (codes.length > 0) {
              const firstCode = codes[0];
              setName(firstCode.name);
              setViewerCode(firstCode.code);
              setDefaultViewerCode(firstCode.code);
              setQueries(firstCode.queries.map((q) => ({ queryName: q.queryName, sql: q.sql })));
            } else {
              setIsNewName(true);
              setName("");
              setViewerCode("");
              setDefaultViewerCode("");
              setQueries([]);
            }
          } catch (error) {
            console.error("Failed to fetch dashboard codes:", error);
            setSavedCodes([]);
            setIsNewName(true);
            setName("");
            setViewerCode("");
            setDefaultViewerCode("");
            setQueries([]);
          }
        } else {
          // strategus - name not used by API (see fetchCode implementation)
          try {
            const code = await operations.fetchCode(config.id, "");
            setViewerCode(code);
            setDefaultViewerCode(code);
          } catch (error) {
            console.error("Failed to fetch default viewer code:", error);
            setDefaultViewerCode("");
            setViewerCode("");
          }
        }
      } finally {
        setInitialLoading(false);
      }
    };

    fetchData();
  }, [open, config.id, config.type, configType, operations]);

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

      if (config.type === "dashboard" || config.type === "cohort") {
        // Save code
        await api.systemPortal.upsertDashboardCode({
          datasetId: config.id,
          code: viewerCode,
          type: configType,
          name,
        });

        const queryPromises = queries
          .filter((query) => query.queryName && query.sql)
          .map((query) =>
            api.systemPortal.upsertDatasetCodeQuery({
              datasetId: config.id,
              type: configType,
              name,
              queryName: query.queryName,
              sql: query.sql,
            })
          );
        await Promise.all(queryPromises);
      } else {
        await operations.saveCode(config.id, viewerCode, name);
      }

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
        message: getText(i18n.saveError, [config.id]),
      });
    } finally {
      setLoading(false);
    }
  }, [viewerCode, config.id, config.type, getText, operations, i18n, name, queries, configType]);

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

  const handleAddQuery = useCallback(() => {
    setQueries((prev) => [...prev, { queryName: "", sql: "" }]);
  }, []);

  const handleQueryChange = useCallback((index: number, field: keyof QueryEntry, value: string) => {
    setQueries((prev) => prev.map((q, i) => (i === index ? { ...q, [field]: value } : q)));
  }, []);

  const handleRemoveQuery = useCallback((index: number) => {
    setQueries((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleNameChange = useCallback(
    (selectedName: string) => {
      if (selectedName === "__new__") {
        setIsNewName(true);
        setNewNameInput("");
        setName("");
        setViewerCode("");
        setDefaultViewerCode("");
        setQueries([]);
      } else {
        setIsNewName(false);
        setName(selectedName);
        const selectedCode = savedCodes.find((c) => c.name === selectedName);
        if (selectedCode) {
          setViewerCode(selectedCode.code);
          setDefaultViewerCode(selectedCode.code);
          setQueries(selectedCode.queries.map((q) => ({ queryName: q.queryName, sql: q.sql })));
        }
      }
      setSelectedTemplate("default");
    },
    [savedCodes]
  );

  const handleNewNameInputChange = useCallback((value: string) => {
    setNewNameInput(value);
    setName(value);
  }, []);

  const dialogClassName = `manage-viewer-dialog manage-viewer-dialog--${config.type}`;

  return (
    <Dialog
      className={dialogClassName}
      title={getText(i18n.title, [config.id])}
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
          {(config.type === "dashboard" || config.type === "cohort") && (
            <div>
              <InputLabel sx={{ mb: 1 }}>Config Type</InputLabel>
              <Select
                sx={{ width: "100%" }}
                variant="standard"
                value={configType}
                onChange={(event) => setConfigType(event.target.value as "dashboard" | "cohort")}
              >
                <MenuItem value="dashboard">Dashboard</MenuItem>
                <MenuItem value="cohort">Cohort</MenuItem>
              </Select>
            </div>
          )}
          <div>
            <InputLabel sx={{ mb: 1 }}>Name</InputLabel>
            {config.type === "dashboard" || config.type === "cohort" ? (
              <Select
                sx={{ width: "100%" }}
                variant="standard"
                value={isNewName ? "__new__" : name}
                onChange={(event) => handleNameChange(event.target.value)}
              >
                {savedCodes.map((code) => (
                  <MenuItem key={code.name} value={code.name}>
                    {code.name}
                  </MenuItem>
                ))}
                <MenuItem value="__new__">
                  <em>+ New</em>
                </MenuItem>
              </Select>
            ) : (
              <TextField
                sx={{ width: "100%" }}
                variant="standard"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter code name"
              />
            )}
          </div>
          {isNewName && (config.type === "dashboard" || config.type === "cohort") && (
            <div>
              <InputLabel sx={{ mb: 1 }}>New Name</InputLabel>
              <TextField
                sx={{ width: "100%" }}
                variant="standard"
                value={newNameInput}
                onChange={(e) => handleNewNameInputChange(e.target.value)}
                placeholder="Enter new name"
              />
            </div>
          )}
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

      {initialLoading ? (
        <div className="manage-viewer-dialog__loading">
          <Loader />
        </div>
      ) : (
        <div className="manage-viewer-dialog__content">
          <SafeEditor
            height="50vh"
            language={editorLanguage}
            value={viewerCode}
            options={{
              scrollBeyondLastLine: false,
              fontSize: "14px",
            }}
            onChange={setViewerCode}
          />
        </div>
      )}
      <Divider />

      <div className="manage-viewer-dialog__queries">
        <div className="manage-viewer-dialog__queries__header">
          <InputLabel>Queries</InputLabel>
          <Button text="Add Query" onClick={handleAddQuery} variant="outlined" size="small" />
        </div>
        {queries.map((query, index) => (
          <div key={index} className="manage-viewer-dialog__queries__entry">
            <TextField
              label="Query Name"
              variant="standard"
              value={query.queryName}
              onChange={(e) => handleQueryChange(index, "queryName", e.target.value)}
              sx={{ flex: 1 }}
            />
            <TextField
              label="SQL"
              variant="standard"
              value={query.sql}
              onChange={(e) => handleQueryChange(index, "sql", e.target.value)}
              sx={{ flex: 2 }}
              multiline
              rows={1}
            />
            <Button text="Remove" onClick={() => handleRemoveQuery(index)} variant="text" size="small" />
          </div>
        ))}
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
