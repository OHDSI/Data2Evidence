import { Box, Button, Loader, TextField, Title } from "@portal/components";
import React, { ChangeEvent, FC, useCallback, useEffect, useState } from "react";
import { api } from "../../../axios/api";
import { ConfigTypes } from "../../../constant";
import { useFeedback, useTranslation } from "../../../contexts";
import { useConfigsByTypes, useOverwriteAllCanvasesFromRemote } from "../../../hooks";
import { useOverwriteAllNotebooksFromRemote } from "../../../hooks/useOverwriteAllNotebooksFromRemote";
import { Config } from "../../../types";
import "./GitConfig.scss";
import { OverwriteAllConfirmDialog } from "./OverwriteAllConfirmDialog";
import { OverwriteAllNotebooksDialog } from "./OverwriteAllNotebooksDialog";

interface DataflowGitConfig {
  repoUrl: string;
  pat: string;
  branch: string;
}

interface NotebookGitConfig {
  repoUrl: string;
  pat: string;
  branch: string;
}

interface FormData {
  dataflow: DataflowGitConfig;
  notebook: NotebookGitConfig;
}

const EMPTY_FORM_DATA: FormData = {
  dataflow: {
    repoUrl: "",
    pat: "",
    branch: "main",
  },
  notebook: {
    repoUrl: "",
    pat: "",
    branch: "main",
  },
};

export const GitConfig: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [showOverwriteNotebooksDialog, setShowOverwriteNotebooksDialog] = useState(false);
  const { setFeedback } = useFeedback();
  const [configs, loading, error] = useConfigsByTypes([
    ConfigTypes.DATAFLOW_GIT_CONFIG,
    ConfigTypes.NOTEBOOK_GIT_CONFIG,
  ]);

  const [overwriteAllFromRemote, isOverwriting, overwriteError] = useOverwriteAllCanvasesFromRemote();
  const [overwriteAllNotebooksFromRemote, isOverwritingNotebooks, overwriteNotebooksError] =
    useOverwriteAllNotebooksFromRemote();

  useEffect(() => {
    let dataflowConfig: DataflowGitConfig | null = null;
    let notebookConfig: NotebookGitConfig | null = null;

    try {
      if (ConfigTypes.DATAFLOW_GIT_CONFIG in configs) {
        dataflowConfig = JSON.parse(configs[ConfigTypes.DATAFLOW_GIT_CONFIG]);
      }

      if (ConfigTypes.NOTEBOOK_GIT_CONFIG in configs) {
        notebookConfig = JSON.parse(configs[ConfigTypes.NOTEBOOK_GIT_CONFIG]);
      }

      const saved: FormData = {
        dataflow: dataflowConfig || EMPTY_FORM_DATA.dataflow,
        notebook: notebookConfig || EMPTY_FORM_DATA.notebook,
      };

      setFormData(saved);
    } catch (err) {
      console.error("Error parsing config:", err);
      setFormData(EMPTY_FORM_DATA);
    }
  }, [configs]);

  const handleDataflowChange = useCallback((field: keyof DataflowGitConfig, value: string) => {
    setFormData((prev) => ({
      ...prev,
      dataflow: {
        ...prev.dataflow,
        [field]: value,
      },
    }));
  }, []);

  const handleNotebookChange = useCallback((field: keyof NotebookGitConfig, value: string) => {
    setFormData((prev) => ({
      ...prev,
      notebook: {
        ...prev.notebook,
        [field]: value,
      },
    }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      const data: Config[] = [
        {
          type: ConfigTypes.DATAFLOW_GIT_CONFIG,
          value: JSON.stringify(formData.dataflow),
        },
        {
          type: ConfigTypes.NOTEBOOK_GIT_CONFIG,
          value: JSON.stringify(formData.notebook),
        },
      ];

      await api.systemPortal.insertOrUpdateConfigs(data);
      setFeedback({
        type: "success",
        message: getText(i18nKeys.GIT_CONFIG__SUCCESS),
        autoClose: 6000,
      });
    } catch (err: any) {
      console.error(err);
      if (err.data?.message) {
        setFeedback({ type: "error", message: err.data.message });
      } else {
        setFeedback({
          type: "error",
          message: getText(i18nKeys.GIT_CONFIG__ERROR),
        });
      }
    } finally {
      setSaving(false);
    }
  }, [
    formData.dataflow,
    formData.notebook,
    setFeedback,
    getText,
    i18nKeys.GIT_CONFIG__SUCCESS,
    i18nKeys.GIT_CONFIG__ERROR,
  ]);

  const handleOverwriteAllClick = useCallback(() => {
    if (!formData.dataflow.repoUrl || !formData.dataflow.branch) {
      setFeedback({
        type: "error",
        message: getText(i18nKeys.GIT_CONFIG__CONFIGURE_FIRST),
      });
      return;
    }
    setShowOverwriteDialog(true);
  }, [formData.dataflow, setFeedback, getText, i18nKeys]);

  const handleOverwriteConfirm = useCallback(async () => {
    try {
      const result = await overwriteAllFromRemote();

      setFeedback({
        type: "success",
        message: getText(i18nKeys.GIT_CONFIG__SYNC_FLOWS_SUCCESS, [result.processedCount.toString()]),
        autoClose: 8000,
      });
      setShowOverwriteDialog(false);
    } catch (error: any) {
      console.error("Failed to overwrite all flows:", error);
      setFeedback({
        type: "error",
        message: error?.message || getText(i18nKeys.GIT_CONFIG__SYNC_FLOWS_ERROR),
      });
    }
  }, [overwriteAllFromRemote, setFeedback, getText, i18nKeys]);

  const handleOverwriteCancel = useCallback(() => {
    setShowOverwriteDialog(false);
  }, []);

  const handleOverwriteAllNotebooksClick = useCallback(() => {
    if (!formData.notebook.repoUrl || !formData.notebook.branch) {
      setFeedback({
        type: "error",
        message: getText(i18nKeys.GIT_CONFIG__CONFIGURE_FIRST),
      });
      return;
    }
    setShowOverwriteNotebooksDialog(true);
  }, [formData.notebook, setFeedback, getText, i18nKeys]);

  const handleOverwriteNotebooksConfirm = useCallback(async () => {
    try {
      const result = await overwriteAllNotebooksFromRemote();

      setFeedback({
        type: "success",
        message: getText(i18nKeys.GIT_CONFIG__SYNC_NOTEBOOKS_SUCCESS, [result.processedCount.toString()]),
        autoClose: 8000,
      });
      setShowOverwriteNotebooksDialog(false);
    } catch (error: any) {
      console.error("Failed to overwrite all notebooks:", error);
      setFeedback({
        type: "error",
        message: error?.message || getText(i18nKeys.GIT_CONFIG__SYNC_NOTEBOOKS_ERROR),
      });
    }
  }, [overwriteAllNotebooksFromRemote, setFeedback, getText, i18nKeys]);

  const handleOverwriteNotebooksCancel = useCallback(() => {
    setShowOverwriteNotebooksDialog(false);
  }, []);

  if (error) console.error(error.message);
  if (overwriteError) console.error(overwriteError.message);
  if (overwriteNotebooksError) console.error(overwriteNotebooksError.message);

  const isDataflowConfigValid = formData.dataflow.repoUrl && formData.dataflow.branch && formData.dataflow.pat;
  const isNotebookConfigValid = formData.notebook.repoUrl && formData.notebook.branch && formData.notebook.pat;

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <div className="git-config">
          <div className="git-config__header">
            <Title>{getText(i18nKeys.GIT_CONFIG__TITLE)}</Title>
          </div>

          <div className="git-config__content">
            <Box mb={4} fontWeight="bold">
              {getText(i18nKeys.GIT_CONFIG__DATAFLOW_SECTION)}
            </Box>

            <Box mb={4}>
              <TextField
                label={getText(i18nKeys.GIT_CONFIG__REPO_URL_LABEL)}
                variant="standard"
                sx={{ width: "100%" }}
                value={formData.dataflow.repoUrl}
                onChange={(event: ChangeEvent<HTMLInputElement>) => handleDataflowChange("repoUrl", event.target.value)}
              />
            </Box>

            <Box mb={4}>
              <TextField
                label={getText(i18nKeys.GIT_CONFIG__PAT_LABEL)}
                variant="standard"
                type="password"
                sx={{ width: "100%" }}
                value={formData.dataflow.pat}
                onChange={(event: ChangeEvent<HTMLInputElement>) => handleDataflowChange("pat", event.target.value)}
              />
            </Box>

            <Box mb={4}>
              <TextField
                label={getText(i18nKeys.GIT_CONFIG__BRANCH_LABEL)}
                variant="standard"
                sx={{ width: "100%" }}
                value={formData.dataflow.branch}
                onChange={(event: ChangeEvent<HTMLInputElement>) => handleDataflowChange("branch", event.target.value)}
              />
            </Box>

            <Box mb={4}>
              <Button
                text={getText(i18nKeys.GIT_CONFIG__SYNC_ALL_FLOWS)}
                variant="contained"
                color="primary"
                onClick={handleOverwriteAllClick}
                disabled={!isDataflowConfigValid || isOverwriting}
                loading={isOverwriting}
              />
            </Box>

            <Box mt={4} mb={4} fontWeight="bold">
              {getText(i18nKeys.GIT_CONFIG__NOTEBOOK_SECTION)}
            </Box>

            <Box mb={4}>
              <TextField
                label={getText(i18nKeys.GIT_CONFIG__REPO_URL_LABEL)}
                variant="standard"
                sx={{ width: "100%" }}
                value={formData.notebook.repoUrl}
                onChange={(event: ChangeEvent<HTMLInputElement>) => handleNotebookChange("repoUrl", event.target.value)}
              />
            </Box>

            <Box mb={4}>
              <TextField
                label={getText(i18nKeys.GIT_CONFIG__PAT_LABEL)}
                variant="standard"
                type="password"
                sx={{ width: "100%" }}
                value={formData.notebook.pat}
                onChange={(event: ChangeEvent<HTMLInputElement>) => handleNotebookChange("pat", event.target.value)}
              />
            </Box>

            <Box mb={4}>
              <TextField
                label={getText(i18nKeys.GIT_CONFIG__BRANCH_LABEL)}
                variant="standard"
                sx={{ width: "100%" }}
                value={formData.notebook.branch}
                onChange={(event: ChangeEvent<HTMLInputElement>) => handleNotebookChange("branch", event.target.value)}
              />
            </Box>

            <Box mb={4}>
              <Button
                text={getText(i18nKeys.GIT_CONFIG__SYNC_ALL_NOTEBOOKS)}
                variant="contained"
                color="primary"
                onClick={handleOverwriteAllNotebooksClick}
                disabled={!isNotebookConfigValid || isOverwritingNotebooks}
                loading={isOverwritingNotebooks}
              />
            </Box>
          </div>

          <div className="git-config__footer">
            <Box display="flex" gap={1} className="git-config__footer-actions">
              <Button text={getText(i18nKeys.GIT_CONFIG__SAVE)} onClick={handleSave} loading={saving} />
            </Box>
          </div>
        </div>
      )}

      <OverwriteAllConfirmDialog
        open={showOverwriteDialog}
        onClose={handleOverwriteCancel}
        onConfirm={handleOverwriteConfirm}
        loading={isOverwriting}
      />

      <OverwriteAllNotebooksDialog
        open={showOverwriteNotebooksDialog}
        onClose={handleOverwriteNotebooksCancel}
        onConfirm={handleOverwriteNotebooksConfirm}
        loading={isOverwritingNotebooks}
      />
    </>
  );
};
