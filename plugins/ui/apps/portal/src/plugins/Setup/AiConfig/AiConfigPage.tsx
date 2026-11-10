import React, { FC, useEffect, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import { Button, Loader, Title } from "@portal/components";
import { api } from "../../../axios/api";
import { useFeedback, useTranslation } from "../../../contexts";
import { AiConfig } from "../../../types";
import "./AiConfigPage.scss";

export const AiConfigPage: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const { setFeedback } = useFeedback();
  const [configs, setConfigs] = useState<AiConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.systemPortal
      .listAiConfigs()
      .then((rows) => {
        if (!cancelled) setConfigs(rows);
      })
      .catch(() => {
        if (!cancelled) setFeedback({ type: "error", message: getText(i18nKeys.AI_CONFIG__LOAD_ERROR) });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [getText, i18nKeys, setFeedback]);

  return (
    <div className="ai-config">
      <div className="ai-config__header">
        <div className="ai-config__heading">
          <div className="ai-config__eyebrow">{getText(i18nKeys.AI_CONFIG__EYEBROW)}</div>
          <Title>{getText(i18nKeys.AI_CONFIG__TITLE)}</Title>
          <p className="ai-config__subtitle">{getText(i18nKeys.AI_CONFIG__SUBTITLE)}</p>
        </div>
        {/* shortcut: disabled until the Add dialog exists. */}
        <Button text={getText(i18nKeys.AI_CONFIG__ADD)} startIcon={<AddIcon />} disabled />
      </div>
      {loading ? (
        <Loader />
      ) : (
        // shortcut: names only; the full list with actions and the empty state replaces this.
        <ul className="ai-config__list">
          {configs.map((config) => (
            <li key={config.id}>{config.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
