import React, { FC, useCallback, useState, useMemo } from "react";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import { PlayCircleFilled, StopCircle } from "@mui/icons-material";
import { Button, Dialog, Select, MenuItem, InputLabel, Loader } from "@portal/components";
import * as monaco from "monaco-editor";
import { loader, Editor } from "@monaco-editor/react";
import { CloseDialogType } from "../../../../types";
import { useKernelViewer } from "../../../../hooks";
import { useTranslation } from "../../../../contexts";
import { api } from "../../../../axios/api";
import { i18nKeys } from "../../../../contexts/app-context/states";
import { createConfigStrategy } from "./configStrategies";
import { useAsyncOperation } from "./hooks/useAsyncOperation";
import { useViewerData } from "./hooks/useViewerData";
import { useQueryManagement } from "./hooks/useQueryManagement";
import { CodeNameSelect } from "./components/CodeNameSelect";
import { QueriesSection } from "./components/QueriesSection";
import { TemplateSelect } from "./components/TemplateSelect";
import "./ManageViewerDialog.scss";

interface ViewerConfig {
  type: "dashboard" | "cohort" | "strategus";
  id: string;
  datasetId?: string;
}

interface ManageViewerDialogProps {
  config: ViewerConfig;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const SafeEditor = Editor as any;

loader.config({ monaco });

const enum ViewerType {
  SHINY_SERVER = "shiny-server",
  R = "r",
  Python = "python",
}

const ManageViewerDialog: FC<ManageViewerDialogProps> = ({ config, open, onClose }) => {
  const { getText } = useTranslation();
  const [templateLanguage, setTemplateLanguage] = useState<ViewerType>(
    config.type === "strategus" ? ViewerType.SHINY_SERVER : ViewerType.R
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string>("default");
  const [codeType, setCodeType] = useState<"dashboard" | "cohort">(config.type === "cohort" ? "cohort" : "dashboard");
  const [nameError, setNameError] = useState<string | null>(null);

  const strategy = useMemo(() => createConfigStrategy(config.type), [config.type]);
  const { loading, feedback, clearFeedback, execute } = useAsyncOperation();
  const [viewerStatus, startViewer, stopViewer] = useKernelViewer(config.id, config.datasetId ?? config.id);

  const {
    templates,
    savedCodes,
    code,
    name,
    isNewName,
    queries,
    originalQueryNames,
    initialLoading,
    setQueries,
    selectCode,
    applyTemplate,
    updateCode,
    updateName,
    markSaved,
  } = useViewerData({
    open,
    configId: config.id,
    configType: config.type,
    codeType,
    strategy,
  });

  const { addQuery, updateQuery, removeQuery, getDeletedQueryNames, getValidQueries } = useQueryManagement({
    queries,
    setQueries,
    originalQueryNames,
  });

  const viewerTypes = useMemo(
    () =>
      config.type === "strategus"
        ? [{ label: "R Shiny Server", value: ViewerType.SHINY_SERVER }]
        : [
            { label: "R", value: ViewerType.R },
            { label: "Python", value: ViewerType.Python },
          ],
    [config.type]
  );

  const editorLanguage = useMemo(() => {
    return templateLanguage === ViewerType.Python ? "python" : "r";
  }, [templateLanguage]);

  const i18n = useMemo(() => {
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

  const handleStartViewer = useCallback(async () => {
    try {
      await startViewer(code);
    } catch (error) {
      console.error("Failed to start viewer:", error);
    }
  }, [startViewer, code]);

  const handleStopViewer = useCallback(async () => {
    try {
      await stopViewer();
    } catch (error) {
      console.error("Failed to stop viewer:", error);
    }
  }, [stopViewer]);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      clearFeedback();
      typeof onClose === "function" && onClose(type);
    },
    [onClose, clearFeedback]
  );

  const handleSave = useCallback(async () => {
    await execute(
      async () => {
        if (strategy.supportsMultipleCodes) {
          // Determine language based on templateLanguage
          let language: string | undefined;
          if (templateLanguage === ViewerType.Python) {
            language = "python";
          } else if (templateLanguage === ViewerType.R) {
            language = "r";
          } else if (templateLanguage === ViewerType.SHINY_SERVER) {
            language = "shiny_server"
          }

          // Save code
          await api.systemPortal.upsertDashboardCode({
            datasetId: config.id,
            code,
            type: codeType,
            name,
            language,
          });

          // Delete removed queries
          const deletedQueryNames = getDeletedQueryNames();
          await Promise.all(
            deletedQueryNames.map((queryName) =>
              api.systemPortal.deleteDatasetCodeQuery({
                datasetId: config.id,
                type: codeType,
                name,
                queryName,
              })
            )
          );

          // Upsert current queries
          const validQueries = getValidQueries();
          await Promise.all(
            validQueries.map((query) =>
              api.systemPortal.upsertDatasetCodeQuery({
                datasetId: config.id,
                type: codeType,
                name,
                queryName: query.queryName,
                sql: query.sql,
              })
            )
          );

          markSaved();
        } else {
          // Determine language based on templateLanguage
          let language: string | undefined;
          if (templateLanguage === ViewerType.Python) {
            language = "python";
          } else if (templateLanguage === ViewerType.R ) {
            language = "r";
          } else if (templateLanguage === ViewerType.SHINY_SERVER) {
            language = "shiny_server"
          }

          await strategy.saveCode({ id: config.id, code, name, type: codeType, language });
        }
        setSelectedTemplate("default");
      },
      {
        successMessage: getText(i18n.saveSuccess),
        errorMessage: getText(i18n.saveError, [config.id]),
      }
    );
  }, [
    execute,
    strategy,
    config.id,
    code,
    name,
    codeType,
    getDeletedQueryNames,
    getValidQueries,
    markSaved,
    getText,
    i18n,
  ]);

  const handleBuildAssets = useCallback(async () => {
    await execute(
      () =>
        api.dataflow.triggerShinyLiveAssetDeployment({
          datasetId: config.id,
          language: templateLanguage,
          appCode: code,
          name: name,
          type: codeType,
        }),
      {
        successMessage: getText(i18nKeys.MANAGE_VIEWER_DIALOG__SHINY_BUILD_SUCCESS),
        errorMessage: getText(i18nKeys.MANAGE_VIEWER_DIALOG__SHINY_BUILD_ERROR),
      }
    );
  }, [execute, config.id, templateLanguage, code, name, codeType]);

  const handleTemplateChange = useCallback(
    (filename: string) => {
      setSelectedTemplate(filename);
      applyTemplate(filename);
    },
    [applyTemplate]
  );

  const validateName = useCallback((value: string): string | null => {
    if (value.includes(" ")) {
      return getText(i18nKeys.MANAGE_VIEWER_DIALOG__NAME_NO_SPACES);
    }
    return null;
  }, []);

  const handleNameChange = useCallback(
    (selectedName: string) => {
      selectCode(selectedName);
      setSelectedTemplate("default");
      setNameError(null);
    },
    [selectCode]
  );

  const handleNewNameInput = useCallback(
    (value: string) => {
      updateName(value);
      setNameError(validateName(value));
    },
    [updateName, validateName]
  );

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
          {strategy.supportsMultipleCodes && (
            <div>
              <InputLabel sx={{ mb: 1 }}>{getText(i18nKeys.MANAGE_VIEWER_DIALOG__CONFIG_TYPE)}</InputLabel>
              <Select
                sx={{ width: "100%" }}
                variant="standard"
                value={codeType}
                onChange={(event) => setCodeType(event.target.value as "dashboard" | "cohort")}
              >
                <MenuItem value="dashboard">{getText(i18nKeys.MANAGE_VIEWER_DIALOG__DASHBOARD)}</MenuItem>
                <MenuItem value="cohort">{getText(i18nKeys.MANAGE_VIEWER_DIALOG__COHORT)}</MenuItem>
              </Select>
            </div>
          )}

          <CodeNameSelect
            savedCodes={savedCodes}
            isNewName={isNewName}
            name={name}
            onNameChange={handleNameChange}
            onNewNameInput={handleNewNameInput}
            supportsMultipleCodes={strategy.supportsMultipleCodes}
            error={!!nameError}
            helperText={nameError || undefined}
          />

          <TemplateSelect
            templates={templates}
            selectedTemplate={selectedTemplate}
            onTemplateChange={handleTemplateChange}
          />

          <div>
            <InputLabel sx={{ mb: 1 }}>{getText(i18nKeys.MANAGE_VIEWER_DIALOG__VIEWER_TYPE)}</InputLabel>
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
            <Button onClick={handleBuildAssets} text={getText(i18nKeys.MANAGE_VIEWER_DIALOG__BUILD_SHINY)} loading={loading} />
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
            value={code}
            options={{
              scrollBeyondLastLine: false,
              fontSize: "14px",
            }}
            onChange={updateCode}
          />
        </div>
      )}
      <Divider />

      {strategy.supportsQueries && (
        <QueriesSection
          queries={queries}
          onAddQuery={addQuery}
          onUpdateQuery={updateQuery}
          onRemoveQuery={removeQuery}
        />
      )}
      <Divider />

      <div className="button-group-actions">
        <Button text={getText(i18n.cancel)} onClick={() => handleClose("cancelled")} variant="outlined" block />
        <Button text={getText(i18n.save)} onClick={handleSave} block loading={loading} disabled={!!nameError} />
      </div>
    </Dialog>
  );
};

export default ManageViewerDialog;
