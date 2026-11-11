import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material";
import { Button, Checkbox, Loader, Title } from "@portal/components";
import { Button as UiButton, Dialog, buildMuiTheme } from "ui-react";
import "ui-react/tokens.css";
import "ui-react/style.css";
import { FEATURE_PYTHIA } from "../../../config";
import { useFeatures, invalidateFeatures } from "../../../hooks";
import { useFeedback, useTranslation } from "../../../contexts";
import { LanguageMappings } from "../../../contexts/app-context/hooks/use-translation";
import { api } from "../../../axios/api";
import { IFeature } from "../../../types";
import "./Feature.scss";

interface FormData {
  features: IFeature[];
}

const d2eTheme = buildMuiTheme();

const EMPTY_FORM_DATA: FormData = {
  features: [],
};

export const Feature: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [features, loading, error] = useFeatures();
  const { setFeedback } = useFeedback();
  const [noConfigOpen, setNoConfigOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // What the server holds, per flag. useFeatures loads once, so Save has to keep this current itself.
  const baseline = useRef<Record<string, boolean>>({});

  const getFeatureLabel = useCallback(
    (feat: IFeature): string => {
      if (feat.nameI18nKey && feat.nameI18nKey in i18nKeys) {
        return getText(feat.nameI18nKey as keyof LanguageMappings);
      }
      return feat.name ?? feat.feature;
    },
    [getText, i18nKeys]
  );

  useEffect(() => {
    baseline.current = Object.fromEntries(features.map((f) => [f.feature, f.isEnabled]));
    setFormData({ features });
  }, [features]);

  const handleToggle = useCallback(
    async (feature: string, checked: boolean) => {
      // Pythia is useless without an AI configuration, so ticking it is checked first (fail closed).
      if (feature === FEATURE_PYTHIA && checked) {
        try {
          const configs = await api.systemPortal.listAiConfigs();
          if (configs.length === 0) {
            setNoConfigOpen(true);
            return;
          }
        } catch (err) {
          console.error(err);
          setFeedback({ type: "error", message: getText(i18nKeys.FEATURE__AI_CONFIG_CHECK_ERROR) });
          return;
        }
      }
      // Functional update, so ticks made on other boxes while the check was pending are kept.
      setFormData((prev) => ({
        ...prev,
        features: prev.features.map((f) => (f.feature === feature ? { ...f, isEnabled: checked } : f)),
      }));
    },
    [getText, i18nKeys, setFeedback]
  );

  const handleGoToAiConfig = useCallback(() => {
    setNoConfigOpen(false);
    navigate(location.pathname, { state: { tab: "setup", subTab: "ai-config", openAdd: true } });
  }, [navigate, location]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      // Only flags the admin changed are sent, so an untouched flag is never overwritten.
      const changed = formData.features.filter((f) => f.isEnabled !== baseline.current[f.feature]);
      if (changed.length > 0) {
        await api.systemPortal.setFeatures(changed);
        baseline.current = Object.fromEntries(formData.features.map((f) => [f.feature, f.isEnabled]));
      }
      // useFeatures caches for the page load, so the write has to drop it or
      // every other reader keeps showing the flags as they were before this save.
      invalidateFeatures();
      setFeedback({ type: "success", message: getText(i18nKeys.FEATURE__SUCCESS), autoClose: 6000 });
    } catch (err: any) {
      console.error(err);

      if (err.data?.message) {
        setFeedback({ type: "error", message: err.data.message });
      } else {
        setFeedback({
          type: "error",
          message: getText(i18nKeys.FEATURE__ERROR),
          description: getText(i18nKeys.FEATURE__ERROR_DESCRIPTION),
        });
      }
    } finally {
      setSaving(false);
    }
  }, [formData, getText]);

  if (error) console.error(error.message);

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <div className="feature">
          <div className="feature__header">
            <Title>{getText(i18nKeys.FEATURE__FEATURE_FLAGS)}</Title>
          </div>
          <div className="feature__content">
            {formData.features
              .sort((a, b) => getFeatureLabel(a).localeCompare(getFeatureLabel(b)))
              .map((feat) => (
                <div key={feat.feature} className="feature__item">
                  <Checkbox
                    checked={feat.isEnabled}
                    label={getFeatureLabel(feat)}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      handleToggle(feat.feature, event.target.checked)
                    }
                  />
                </div>
              ))}
          </div>
          <div className="feature__footer">
            <div style={{ display: "flex", gap: "8px" }} className="feature__footer-actions">
              <Button text={getText(i18nKeys.FEATURE__SAVE)} onClick={handleSave} loading={saving} />
            </div>
          </div>
          <ThemeProvider theme={d2eTheme}>
            <Dialog
              open={noConfigOpen}
              size="s"
              title={getText(i18nKeys.FEATURE__NO_AI_CONFIG_TITLE)}
              closeLabel={getText(i18nKeys.AI_CONFIG__CLOSE)}
              onClose={() => setNoConfigOpen(false)}
              actions={
                <>
                  <UiButton variant="secondary" onClick={() => setNoConfigOpen(false)}>
                    {getText(i18nKeys.FEATURE__NO_AI_CONFIG_CANCEL)}
                  </UiButton>
                  <UiButton onClick={handleGoToAiConfig}>{getText(i18nKeys.FEATURE__NO_AI_CONFIG_GO)}</UiButton>
                </>
              }
            >
              {getText(i18nKeys.FEATURE__NO_AI_CONFIG_BODY)}
            </Dialog>
          </ThemeProvider>
        </div>
      )}
    </>
  );
};
