import React, { ChangeEvent, FC, useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, Checkbox, Loader, Title } from "@portal/components";
import { useFeatures } from "../../../hooks";
import { useFeedback, useTranslation } from "../../../contexts";
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

  const FEATURES: Record<string, { name: string }> = useMemo(
    () => ({
      datasetFilter: {
        name: getText(i18nKeys.FEATURE__DATASET_FILTER),
      },
      datasetSearch: {
        name: getText(i18nKeys.FEATURE__DATASET_SEARCH),
      },
      conceptSets: {
        name: getText(i18nKeys.FEATURE__CONCEPTS),
      },
      cohort: {
        name: getText(i18nKeys.FEATURE__COHORT),
      },
      starboard: {
        name: getText(i18nKeys.FEATURE__NOTEBOOKS),
      },
      kaplanMeier: {
        name: getText(i18nKeys.FEATURE__KAPLAN_MEIER),
      },
      strategus: {
        name: getText(i18nKeys.FEATURE__STRATEGUS),
      },
      fhirServer: {
        name: getText(i18nKeys.FEATURE__FHIR_SERVER),
      },
    }),
    [getText]
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
              .sort((a, b) => {
                const featureOrder = Object.keys(FEATURES);
                const indexA = featureOrder.indexOf(a.feature);
                const indexB = featureOrder.indexOf(b.feature);

                if (indexA === -1 && indexB === -1) {
                  return a.feature.localeCompare(b.feature);
                }
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;

                return indexA - indexB;
              })
              .map((feat) => (
                <Box key={feat.feature} className="feature__item">
                  <Checkbox
                    checked={feat.isEnabled}
                    label={FEATURES[feat.feature]?.name ?? feat.feature}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      handleFormDataChange({
                        features: formData.features.map((f) =>
                          f.feature === feat.feature ? { ...f, isEnabled: event.target.checked } : f
                        ),
                      })
                    }
                  />
                </Box>
              ))}
          </div>
          <div className="feature__footer">
            <Box display="flex" gap={1} className="feature__footer-actions">
              <Button text={getText(i18nKeys.FEATURE__SAVE)} onClick={handleSave} loading={saving} />
            </Box>
          </div>
        </div>
      )}
    </>
  );
};
