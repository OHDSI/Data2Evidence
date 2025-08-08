import React, { FC, useCallback, useEffect, useMemo, useState, ChangeEvent } from "react";
import { Button, Title, Checkbox, Loader } from "@portal/components";
import SimpleMdeReact from "react-simplemde-editor";
import { useConfigsByTypes } from "../../../hooks";
import { api } from "../../../axios/api";
import { useFeedback, useTranslation } from "../../../contexts";
import { i18nKeys } from "../../../contexts/app-context/states";
import { isEqual } from "lodash";
import { ConfigTypes } from "../../../constant";
import "./OverviewDescription.scss";

const mdeOptions = {
  hideIcons: ["side-by-side", "fullscreen"],
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
  [ConfigTypes.DISCLAIMER_DISPLAY]: string;
}

const EMPTY_FORM_DATA: FormData = {
  [ConfigTypes.OVERVIEW_DESCRIPTION]: "",
  [ConfigTypes.TERMS_OF_USE]: "",
  [ConfigTypes.TERMS_OF_USE_DISPLAY]: "0",
  [ConfigTypes.PRIVACY_POLICY]: "",
  [ConfigTypes.PRIVACY_POLICY_DISPLAY]: "0",
  [ConfigTypes.IMPRINT]: "",
  [ConfigTypes.IMPRINT_DISPLAY]: "0",
  [ConfigTypes.DISCLAIMER_DISPLAY]: "0",
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
    ],
    refetch
  );

  const { setFeedback, setGenericErrorFeedback } = useFeedback();
  const { getText } = useTranslation();
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData({ ...formData, ...configs });
  }, [configs]);

  const hasChanges = useMemo(() => !isEqual(formData, configs), [formData]);

  const handleFormDataChange = useCallback((changes: { [field: string]: string }) => {
    setFormData((formData) => ({ ...formData, ...changes }));
  }, []);

  const handleRevertChanges = useCallback(() => {
    handleFormDataChange({ [ConfigTypes.OVERVIEW_DESCRIPTION]: configs[ConfigTypes.OVERVIEW_DESCRIPTION] });
  }, [configs]);

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

      <div className="overview_description__buttons">
        <Button
          text={getText(i18nKeys.OVERVIEW_DESCRIPTION__REVERT_CHANGES)}
          variant="outlined"
          disabled={!hasChanges}
          onClick={handleRevertChanges}
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
          label="Display Terms Of Use"
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
          label="Display Privacy Policy"
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
          label="Display Imprint"
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            handleFormDataChange({ [ConfigTypes.IMPRINT_DISPLAY]: event.target.checked ? "1" : "0" })
          }
        />
      </div>

      <div className="overview_description__header">
        <Title>{getText(i18nKeys.IMPRINT__TITLE)}</Title>
      </div>

      <div className="overview_description__content">
        <Checkbox
          checked={convertStringToBoolean(formData[ConfigTypes.DISCLAIMER_DISPLAY])}
          label="Display Disclaimer When Logged In"
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            handleFormDataChange({ [ConfigTypes.DISCLAIMER_DISPLAY]: event.target.checked ? "1" : "0" })
          }
        />
      </div>

      <div className="overview_description__buttons">
        <Button
          text={getText(i18nKeys.OVERVIEW_DESCRIPTION__SAVE)}
          disabled={!hasChanges}
          onClick={handleSave}
          loading={loading}
        />
      </div>
    </div>
  );
};
