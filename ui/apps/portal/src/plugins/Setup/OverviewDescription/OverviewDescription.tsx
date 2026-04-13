import React, { FC, useCallback, useEffect, useMemo, useRef, useState, ChangeEvent } from "react";
import { Button, Title, Checkbox, Loader } from "@portal/components";
import SimpleMdeReact from "react-simplemde-editor";
import { useConfigsByTypes } from "../../../hooks";
import { api } from "../../../axios/api";
import { useFeedback, useTranslation } from "../../../contexts";
import { i18nKeys } from "../../../contexts/app-context/states";
import { isEqual } from "lodash";
import { ConfigTypes } from "../../../constant";
import env from "../../../env";
import "./OverviewDescription.scss";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg"];
const MAX_IMAGE_SIZE = 1_048_576; // 1MB

const mdeOptions = {
  hideIcons: ["side-by-side", "fullscreen"] as readonly ("side-by-side" | "fullscreen")[],
  maxHeight: "150px",
};

interface FormData {
  [ConfigTypes.OVERVIEW_DESCRIPTION]: string;
  [ConfigTypes.TERMS_OF_USE]: string;
  [ConfigTypes.TERMS_OF_USE_DISPLAY]: string;
  [ConfigTypes.PRIVACY_POLICY]: string;
  [ConfigTypes.PRIVACY_POLICY_DISPLAY]: string;
  [ConfigTypes.IMPRINT]: string;
  [ConfigTypes.IMPRINT_DISPLAY]: string;
  [ConfigTypes.DISCLAIMER]: string;
  [ConfigTypes.DISCLAIMER_DISPLAY]: string;
  [ConfigTypes.HEADER_IMAGE]: string;
}

const EMPTY_FORM_DATA: FormData = {
  [ConfigTypes.OVERVIEW_DESCRIPTION]: "",
  [ConfigTypes.TERMS_OF_USE]: "",
  [ConfigTypes.TERMS_OF_USE_DISPLAY]: "0",
  [ConfigTypes.PRIVACY_POLICY]: "",
  [ConfigTypes.PRIVACY_POLICY_DISPLAY]: "0",
  [ConfigTypes.IMPRINT]: "",
  [ConfigTypes.IMPRINT_DISPLAY]: "0",
  [ConfigTypes.DISCLAIMER]: "",
  [ConfigTypes.DISCLAIMER_DISPLAY]: "0",
  [ConfigTypes.HEADER_IMAGE]: "",
};

export const OverviewDescription: FC = () => {
  const [refetch, setRefetch] = useState(0);
  const [configs, configsLoading] = useConfigsByTypes(
    [
      ConfigTypes.OVERVIEW_DESCRIPTION,
      ConfigTypes.IMPRINT,
      ConfigTypes.IMPRINT_DISPLAY,
      ConfigTypes.PRIVACY_POLICY,
      ConfigTypes.PRIVACY_POLICY_DISPLAY,
      ConfigTypes.TERMS_OF_USE,
      ConfigTypes.TERMS_OF_USE_DISPLAY,
      ConfigTypes.DISCLAIMER,
      ConfigTypes.DISCLAIMER_DISPLAY,
      ConfigTypes.HEADER_IMAGE,
    ],
    refetch
  );

  const { setFeedback, setGenericErrorFeedback } = useFeedback();
  const { getText } = useTranslation();
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData({ ...EMPTY_FORM_DATA, ...configs });
  }, [configs]);

  const savedFormData = useMemo(() => ({ ...EMPTY_FORM_DATA, ...configs }), [configs]);
  const hasChanges = useMemo(() => !isEqual(formData, savedFormData), [formData, savedFormData]);

  const handleFormDataChange = useCallback((changes: { [field: string]: string }) => {
    setFormData((formData) => ({ ...formData, ...changes }));
  }, []);

  const handleDiscardChanges = useCallback(() => {
    setFormData(savedFormData);
  }, [savedFormData]);

  const handleSave = useCallback(async () => {
    try {
      setLoading(true);
      const parsedData = Object.keys(formData).map((key) => ({
        type: key as ConfigTypes,
        value: String(formData[key as keyof FormData]),
      }));
      await api.systemPortal.insertOrUpdateConfigs(parsedData);
      setFeedback({
        type: "success",
        message: getText(i18nKeys.OVERVIEW_DESCRIPTION__SUCCESS_MESSAGE),
        autoClose: 6000,
      });
      setRefetch((refetch) => refetch + 1);
    } catch (error: any) {
      if (error.data?.message) {
        setFeedback({ type: "error", message: error.data.message });
      } else {
        setGenericErrorFeedback();
      }
    } finally {
      setLoading(false);
    }
  }, [formData]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setFeedback({ type: "error", message: getText(i18nKeys.HEADER_IMAGE__ERROR_INVALID_TYPE) });
        event.target.value = "";
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setFeedback({ type: "error", message: getText(i18nKeys.HEADER_IMAGE__ERROR_TOO_LARGE) });
        event.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        handleFormDataChange({ [ConfigTypes.HEADER_IMAGE]: reader.result as string });
      };
      reader.readAsDataURL(file);

      // Reset input so re-uploading the same file triggers onChange
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [handleFormDataChange, setFeedback, getText]
  );

  const handleRemoveImage = useCallback(() => {
    handleFormDataChange({ [ConfigTypes.HEADER_IMAGE]: "" });
  }, [handleFormDataChange]);

  const headerImageSrc = formData[ConfigTypes.HEADER_IMAGE] || `${env.PUBLIC_URL}/assets/landing-page-illustration.svg`;
  const hasCustomImage = !!formData[ConfigTypes.HEADER_IMAGE];

  const convertStringToBoolean = useCallback((s: string) => {
    return s === "1";
  }, []);

  if (configsLoading) {
    return (
      <div className="overview_description">
        <Loader />
      </div>
    );
  }

  return (
    <div className="overview_description">
      <div className="overview_description__header">
        <Title>{getText(i18nKeys.HEADER_IMAGE__TITLE)}</Title>
      </div>
      <div className="overview_description__content">
        <div className="overview_description__header-image">
          <div className="overview_description__banner-preview">
            <img className="overview_description__banner-preview-image" alt="Header preview" src={headerImageSrc} />
            <div className="overview_description__banner-preview-text">
              <div className="overview_description__banner-preview-title">Data2Evidence</div>
              <div className="overview_description__banner-preview-description">
                {formData[ConfigTypes.OVERVIEW_DESCRIPTION] || getText(i18nKeys.HEADER_IMAGE__PLACEHOLDER_DESCRIPTION)}
              </div>
            </div>
          </div>
          <div className="overview_description__header-image-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={handleImageUpload}
              style={{ display: "none" }}
            />
            <Button
              text={getText(i18nKeys.HEADER_IMAGE__UPLOAD)}
              variant="outlined"
              onClick={() => fileInputRef.current?.click()}
            />
            {hasCustomImage && (
              <Button
                text={getText(i18nKeys.HEADER_IMAGE__RESTORE_DEFAULT)}
                variant="outlined"
                onClick={handleRemoveImage}
              />
            )}
          </div>
          <div className="overview_description__header-image-hint">{getText(i18nKeys.HEADER_IMAGE__HINT)}</div>
        </div>
      </div>

      <div className="overview_description__header">
        <Title>{getText(i18nKeys.OVERVIEW_DESCRIPTION__TITLE)}</Title>
      </div>
      <div className="overview_description__content">
        <SimpleMdeReact
          value={formData[ConfigTypes.OVERVIEW_DESCRIPTION]}
          onChange={(value) => handleFormDataChange({ [ConfigTypes.OVERVIEW_DESCRIPTION]: value })}
          options={mdeOptions}
          style={{ marginTop: "11px" }}
        />
      </div>

      <div className="overview_description__header">
        <Title>{getText(i18nKeys.TERMS_OF_USE__TITLE)}</Title>
      </div>

      <div className="overview_description__content">
        <SimpleMdeReact
          value={formData[ConfigTypes.TERMS_OF_USE]}
          onChange={(value) => handleFormDataChange({ [ConfigTypes.TERMS_OF_USE]: value })}
          options={mdeOptions}
          style={{ marginTop: "11px" }}
        />

        <Checkbox
          checked={convertStringToBoolean(formData[ConfigTypes.TERMS_OF_USE_DISPLAY])}
          label={getText(i18nKeys.OVERVIEW_DESCRIPTION__DISPLAY_TERMS_OF_USE)}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            handleFormDataChange({ [ConfigTypes.TERMS_OF_USE_DISPLAY]: event.target.checked ? "1" : "0" })
          }
        />
      </div>

      <div className="overview_description__header">
        <Title>{getText(i18nKeys.PRIVACY_POLICY__TITLE)}</Title>
      </div>

      <div className="overview_description__content">
        <SimpleMdeReact
          value={formData[ConfigTypes.PRIVACY_POLICY]}
          onChange={(value) => handleFormDataChange({ [ConfigTypes.PRIVACY_POLICY]: value })}
          options={mdeOptions}
          style={{ marginTop: "11px" }}
        />

        <Checkbox
          checked={convertStringToBoolean(formData[ConfigTypes.PRIVACY_POLICY_DISPLAY])}
          label={getText(i18nKeys.OVERVIEW_DESCRIPTION__DISPLAY_PRIVACY_POLICY)}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            handleFormDataChange({ [ConfigTypes.PRIVACY_POLICY_DISPLAY]: event.target.checked ? "1" : "0" })
          }
        />
      </div>

      <div className="overview_description__header">
        <Title>{getText(i18nKeys.IMPRINT__TITLE)}</Title>
      </div>

      <div className="overview_description__content">
        <SimpleMdeReact
          value={formData[ConfigTypes.IMPRINT]}
          onChange={(value) => handleFormDataChange({ [ConfigTypes.IMPRINT]: value })}
          options={mdeOptions}
          style={{ marginTop: "11px" }}
        />

        <Checkbox
          checked={convertStringToBoolean(formData[ConfigTypes.IMPRINT_DISPLAY])}
          label={getText(i18nKeys.OVERVIEW_DESCRIPTION__DISPLAY_IMPRINT)}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            handleFormDataChange({ [ConfigTypes.IMPRINT_DISPLAY]: event.target.checked ? "1" : "0" })
          }
        />
      </div>

      <div className="overview_description__header">
        <Title>{getText(i18nKeys.DISCLAIMER__TITLE)}</Title>
      </div>

      <div className="overview_description__content">
        <SimpleMdeReact
          value={formData[ConfigTypes.DISCLAIMER]}
          onChange={(value) => handleFormDataChange({ [ConfigTypes.DISCLAIMER]: value })}
          options={mdeOptions}
          style={{ marginTop: "11px" }}
        />

        <Checkbox
          checked={convertStringToBoolean(formData[ConfigTypes.DISCLAIMER_DISPLAY])}
          label={getText(i18nKeys.OVERVIEW_DESCRIPTION__DISPLAY_DISCLAIMER)}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            handleFormDataChange({ [ConfigTypes.DISCLAIMER_DISPLAY]: event.target.checked ? "1" : "0" })
          }
        />
      </div>

      {hasChanges && (
        <div className="overview_description__fixed-footer">
          <div className="overview_description__fixed-footer-content">
            <Button
              text={getText(i18nKeys.OVERVIEW_DESCRIPTION__DISCARD_CHANGES)}
              variant="outlined"
              onClick={handleDiscardChanges}
            />
            <Button text={getText(i18nKeys.OVERVIEW_DESCRIPTION__SAVE)} onClick={handleSave} loading={loading} />
          </div>
        </div>
      )}
    </div>
  );
};
