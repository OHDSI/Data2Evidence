import React, { ChangeEvent, FC, useCallback, useEffect, useState } from "react";
import { Box, Button, Loader, TextField, Title } from "@portal/components";
import { api } from "../../../axios/api";
import { useConfigsByTypes, useOverwriteAllCanvasesFromRemote } from "../../../hooks";
import { useFeedback, useTranslation } from "../../../contexts";
import { Config } from "../../../types";
import { ConfigTypes } from "../../../constant";
import { OverwriteAllConfirmDialog } from "./OverwriteAllConfirmDialog";
import "./GitConfig.scss";

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
  const { setFeedback } = useFeedback();
  const [configs, loading, error] = useConfigsByTypes([
    ConfigTypes.DATAFLOW_GIT_CONFIG,
    ConfigTypes.NOTEBOOK_GIT_CONFIG,
  ]);

  const [overwriteAllFromRemote, isOverwriting, overwriteError] = useOverwriteAllCanvasesFromRemote();

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
    i18nKeys.GIT_CONFIG__ERROR
  ]);

  const handleOverwriteAllClick = useCallback(() => {
    if (!formData.dataflow.repoUrl || !formData.dataflow.branch) {
      setFeedback({
        type: "error",
        message: "Please configure the dataflow Git repository URL and branch first.",
      });
      return;
    }
    setShowOverwriteDialog(true);
  }, [formData.dataflow, setFeedback]);

  const handleOverwriteConfirm = useCallback(async () => {
    try {
      const result = await overwriteAllFromRemote();

      setFeedback({
        type: "success",
        message: `Successfully imported ${result.processedCount} flows from remote repository.`,
        autoClose: 8000,
      });
      setShowOverwriteDialog(false);
    } catch (error: any) {
      console.error("Failed to overwrite all flows:", error);
      setFeedback({
        type: "error",
        message: error?.message || "Failed to import flows from remote repository.",
      });
    }
  }, [overwriteAllFromRemote, setFeedback]);

  const handleOverwriteCancel = useCallback(() => {
    setShowOverwriteDialog(false);
  }, []);

  if (error) console.error(error.message);
  if (overwriteError) console.error(overwriteError.message);

  const isDataflowConfigValid = formData.dataflow.repoUrl && formData.dataflow.branch && formData.dataflow.pat;

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
                text="Synchronize All Flows from Remote"
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
    </>
  );
};
