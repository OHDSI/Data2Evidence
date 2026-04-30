import React, { ChangeEvent, FC, useCallback, useEffect, useState } from "react";
import { Button, Checkbox, Loader, Title } from "@portal/components";
import { useFeatures } from "../../../hooks";
import { useFeedback, useTranslation } from "../../../contexts";
import { LanguageMappings } from "../../../contexts/app-context/hooks/use-translation";
import { api } from "../../../axios/api";
import { IFeature } from "../../../types";
import "./Feature.scss";

interface FormData {
  features: IFeature[];
}

const EMPTY_FORM_DATA: FormData = {
  features: [],
};

export const Feature: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [features, loading, error] = useFeatures();
  const { setFeedback } = useFeedback();

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
    setFormData({ features });
  }, [features]);

  const handleFormDataChange = useCallback((updates: { [field: string]: any }) => {
    setFormData((formData) => ({ ...formData, ...updates }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      await api.systemPortal.setFeatures(formData.features);
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
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      handleFormDataChange({
                        features: formData.features.map((f) =>
                          f.feature === feat.feature ? { ...f, isEnabled: event.target.checked } : f
                        ),
                      })
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
        </div>
      )}
    </>
  );
};
