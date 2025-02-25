import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { Button, Title } from "@portal/components";
import SimpleMdeReact from "react-simplemde-editor";
import { useOverviewDescription } from "../../../hooks";
import { api } from "../../../axios/api";
import { useFeedback, useTranslation } from "../../../contexts";
import { i18nKeys } from "../../../contexts/app-context/states";
import "./OverviewDescription.scss";

const mdeOptions = {
  hideIcons: ["side-by-side", "fullscreen"],
  maxHeight: "150px",
};

export const OverviewDescription: FC = () => {
  const [refetch, setRefetch] = useState(0);
  const [overviewDescription] = useOverviewDescription(false, refetch);
  const { setFeedback, setGenericErrorFeedback } = useFeedback();
  const { getText } = useTranslation();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (overviewDescription) {
      setInput(overviewDescription.value);
    }
  }, [overviewDescription]);

  const hasChanges = useMemo(() => input !== overviewDescription.value, [input, overviewDescription]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  const handleRevertChanges = useCallback(() => {
    setInput(overviewDescription.value);
  }, [overviewDescription]);

  const handleSave = useCallback(async () => {
    try {
      setLoading(true);
      await api.systemPortal.updateConfig({ type: overviewDescription.type, value: input });
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
  }, [overviewDescription, input]);

  return (
    <div className="overview_description">
      <div className="overview_description__header">
        <Title>{getText(i18nKeys.OVERVIEW_DESCRIPTION__TITLE)}</Title>
      </div>
      <div className="overview_description__content">
        <SimpleMdeReact
          value={input}
          onChange={(value) => handleInputChange(value)}
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
