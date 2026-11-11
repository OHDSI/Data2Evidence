import React, { FC, useEffect, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import { ThemeProvider } from "@mui/material";
import { Button, PageHeader, Spinner, buildMuiTheme } from "ui-react";
import "ui-react/tokens.css";
import "ui-react/style.css";
import { api } from "../../../axios/api";
import { useFeedback, useTranslation } from "../../../contexts";
import { AiConfig } from "../../../types/aiConfig";
import { AiConfigDialog } from "./AiConfigDialog";
import "./AiConfigPage.scss";

const d2eTheme = buildMuiTheme();

export const AiConfigPage: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const { setFeedback } = useFeedback();
  const [configs, setConfigs] = useState<AiConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

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
    <ThemeProvider theme={d2eTheme}>
      <div className="ai-config">
        <PageHeader
          overline={getText(i18nKeys.AI_CONFIG__EYEBROW)}
          title={getText(i18nKeys.AI_CONFIG__TITLE)}
          description={getText(i18nKeys.AI_CONFIG__SUBTITLE)}
          actions={
            <Button prependIcon={<AddIcon />} disabled={loading} onClick={() => setAdding(true)}>
              {getText(i18nKeys.AI_CONFIG__ADD)}
            </Button>
          }
        />
        {loading ? (
          <Spinner center />
        ) : (
          // shortcut: names only; the full list with actions and the empty state replaces this.
          <ul className="ai-config__list">
            {configs.map((config) => (
              <li key={config.id}>{config.name}</li>
            ))}
          </ul>
        )}
        {adding && (
          <AiConfigDialog
            onClose={() => setAdding(false)}
            // The write response is the new row; the list is not re-fetched.
            onSaved={(saved) => {
              setConfigs((rows) => [...rows, saved]);
              setAdding(false);
            }}
          />
        )}
      </div>
    </ThemeProvider>
  );
};
