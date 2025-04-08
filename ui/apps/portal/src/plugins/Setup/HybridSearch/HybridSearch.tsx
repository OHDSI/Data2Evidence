import React, { ChangeEvent, FC, useCallback, useEffect, useState } from "react";
import { Box, Button, Checkbox, Loader, TextField, Title } from "@portal/components";
import { api } from "../../../axios/api";
import { useConfigsByTypes } from "../../../hooks";
import { useFeedback, useTranslation } from "../../../contexts";
import { Config } from "../../../types";
import { ConfigTypes } from "../../../constant";
import "./HybridSearch.scss";

interface FormData {
  isEnabled: boolean;
  semanticRatio: number;
  model: string;
}

const EMPTY_FORM_DATA: FormData = {
  isEnabled: false,
  semanticRatio: 0.5,
  model: "",
};

export const HybridSearch: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const { setFeedback } = useFeedback();
  const [configs, loading, error] = useConfigsByTypes([ConfigTypes.HYBRID_SEARCH]);

  useEffect(() => {
    if (ConfigTypes.HYBRID_SEARCH in configs) {
      let parsedConfig: FormData | null = null;
      try {
        parsedConfig = JSON.parse(configs[ConfigTypes.HYBRID_SEARCH]);

        const saved: FormData = {
          isEnabled: parsedConfig?.isEnabled || false,
          semanticRatio: parsedConfig?.semanticRatio || 0,
          model: parsedConfig?.model || "",
        };

        setFormData(saved);
      } catch (err) {
        setFormData(EMPTY_FORM_DATA);
      }
    } else {
      setFormData(EMPTY_FORM_DATA);
    }
  }, [configs]);

  const handleFormDataChange = useCallback((updates: { [field: string]: any }) => {
    setFormData((formData) => ({ ...formData, ...updates }));
  }, []);

  const modelError = !formData.model;

  const semanticRatioError = formData.semanticRatio < 0 || formData.semanticRatio > 1 || isNaN(formData.semanticRatio);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      const data: Config[] = [{ type: ConfigTypes.HYBRID_SEARCH, value: JSON.stringify(formData) }];
      await api.systemPortal.insertOrUpdateConfigs(data);
      setFeedback({ type: "success", message: getText(i18nKeys.HYBRID_SEARCH__SUCCESS), autoClose: 6000 });
    } catch (err: any) {
      console.error(err);

      if (err.data?.message) {
        setFeedback({ type: "error", message: err.data.message });
      } else {
        setFeedback({
          type: "error",
          message: getText(i18nKeys.HYBRID_SEARCH__ERROR),
          description: getText(i18nKeys.HYBRID_SEARCH__ERROR_DESCRIPTION),
        });
      }
    } finally {
      setSaving(false);
    }
  }, [formData, setFeedback, getText]);

  if (error) console.error(error.message);

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <div className="hybrid-search">
          <div className="hybrid-search__header">
            <Title>{getText(i18nKeys.HYBRID_SEARCH__CONFIGURATION)}</Title>
          </div>
          <div className="hybrid-search__content">
            <Box mb={4}>
              <Checkbox
                checked={formData.isEnabled}
                label={getText(i18nKeys.HYBRID_SEARCH__ENABLE)}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  handleFormDataChange({ isEnabled: event.target.checked })
                }
              />
            </Box>
            <Box mb={4}>
              <TextField
                label={getText(i18nKeys.HYBRID_SEARCH__SEMANTIC_RATIO)}
                variant="standard"
                sx={{ width: "100%" }}
                value={formData.semanticRatio}
                onChange={(event) => handleFormDataChange({ semanticRatio: event.target?.value })}
                error={semanticRatioError}
                helperText={semanticRatioError && getText(i18nKeys.HYBRID_SEARCH__SEMANTIC_RATIO_ERROR)}
              />
            </Box>
            <Box mb={4}>
              <TextField
                label={getText(i18nKeys.HYBRID_SEARCH__EMBEDDINGS_MODEL)}
                variant="standard"
                sx={{ width: "100%" }}
                value={formData.model}
                onChange={(event) => handleFormDataChange({ model: event.target?.value })}
                error={modelError}
                helperText={modelError && getText(i18nKeys.HYBRID_SEARCH__EMBEDDINGS_MODEL_ERROR)}
              />
            </Box>
          </div>
          <div className="hybrid-search__footer">
            <Box display="flex" gap={1} className="hybrid-search__footer-actions">
              <Button text={getText(i18nKeys.HYBRID_SEARCH__SAVE)} onClick={handleSave} loading={saving} />
            </Box>
          </div>
        </div>
      )}
    </>
  );
};
