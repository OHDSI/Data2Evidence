import React, { FC, useEffect, useRef, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { ThemeProvider } from "@mui/material";
import { Button, Chip, EmptyState, PageHeader, Spinner, buildMuiTheme } from "ui-react";
import "ui-react/tokens.css";
import "ui-react/style.css";
import { api } from "../../../axios/api";
import { useFeedback, useTranslation } from "../../../contexts";
import { AiConfig } from "../../../types/aiConfig";
import { AiConfigDialog } from "./AiConfigDialog";
import { connectionSummary, sortAiConfigs, upsertAiConfig } from "./aiConfigList";
import "./AiConfigPage.scss";

const d2eTheme = buildMuiTheme();

const PROVIDER_LABEL_KEYS = {
  bedrock: "AI_CONFIG__PROVIDER_BEDROCK",
  anthropic: "AI_CONFIG__PROVIDER_ANTHROPIC",
  "openai-compatible": "AI_CONFIG__PROVIDER_OPENAI_COMPATIBLE",
} as const;

export const AiConfigPage: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const { setFeedback, clearFeedback, getFeedback } = useFeedback();
  // Read through a ref so the load effect does not re-run on every feedback change.
  const feedbackRef = useRef(getFeedback());
  feedbackRef.current = getFeedback();
  const [configs, setConfigs] = useState<AiConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AiConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    api.systemPortal
      .listAiConfigs()
      .then((rows) => {
        if (cancelled) return;
        setConfigs(sortAiConfigs(rows));
        // Clear only this page's load error; toasts set by other pages must survive.
        if (feedbackRef.current?.message === getText(i18nKeys.AI_CONFIG__LOAD_ERROR)) clearFeedback();
      })
      .catch(() => {
        if (cancelled) return;
        setLoadFailed(true);
        setFeedback({ type: "error", variant: "alert", message: getText(i18nKeys.AI_CONFIG__LOAD_ERROR) });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [getText, i18nKeys, setFeedback, clearFeedback]);

  return (
    <ThemeProvider theme={d2eTheme}>
      <div className="ai-config">
        <div className="ai-config__card">
          <PageHeader
            overline={getText(i18nKeys.AI_CONFIG__EYEBROW)}
            title={getText(i18nKeys.AI_CONFIG__TITLE)}
            description={getText(i18nKeys.AI_CONFIG__SUBTITLE)}
            actions={
              <Button prependIcon={<AddIcon />} disabled={loading || loadFailed} onClick={() => setAdding(true)}>
                {getText(i18nKeys.AI_CONFIG__ADD)}
              </Button>
            }
          />
          {loading ? (
            <Spinner center />
          ) : loadFailed ? null : configs.length === 0 ? (
            <div className="ai-config__empty">
              <EmptyState
                title={getText(i18nKeys.AI_CONFIG__EMPTY_TITLE)}
                description={getText(i18nKeys.AI_CONFIG__EMPTY_DESCRIPTION)}
              />
            </div>
          ) : (
            <ul className="ai-config__list">
              {configs.map((config) => (
                <li key={config.id} className="ai-config__row">
                  <div className="ai-config__main">
                    <span className="ai-config__name">{config.name}</span>
                    <dl className="ai-config__fields">
                      <div className="ai-config__field">
                        <dt>{getText(i18nKeys.AI_CONFIG__COLUMN_PROVIDER)}</dt>
                        <dd>{getText(i18nKeys[PROVIDER_LABEL_KEYS[config.provider]])}</dd>
                      </div>
                      <div className="ai-config__field">
                        <dt>{getText(i18nKeys.AI_CONFIG__COLUMN_MODEL)}</dt>
                        <dd>{config.model}</dd>
                      </div>
                      <div className="ai-config__field">
                        <dt>{getText(i18nKeys.AI_CONFIG__COLUMN_CONNECTION)}</dt>
                        <dd>
                          {connectionSummary(config, {
                            apiKey: getText(i18nKeys.AI_CONFIG__CONNECTION_API_KEY),
                            workspace: getText(i18nKeys.AI_CONFIG__CONNECTION_WORKSPACE),
                          })}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div className="ai-config__actions">
                    {config.isActive && (
                      <Chip
                        variant="positive"
                        icon="mdi-check-circle-outline"
                        label={getText(i18nKeys.AI_CONFIG__ACTIVE)}
                      />
                    )}
                    <Button
                      variant="ghost"
                      prependIcon={<EditOutlinedIcon />}
                      aria-label={`${getText(i18nKeys.AI_CONFIG__EDIT)} ${config.name}`}
                      onClick={() => setEditing(config)}
                    >
                      {getText(i18nKeys.AI_CONFIG__EDIT)}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {adding && (
          <AiConfigDialog
            onClose={() => setAdding(false)}
            // The write response is the new row; the list is not re-fetched.
            onSaved={(saved) => {
              setConfigs((rows) => sortAiConfigs(upsertAiConfig(rows, saved)));
              setAdding(false);
            }}
          />
        )}
        {editing && (
          <AiConfigDialog
            config={editing}
            onClose={() => setEditing(null)}
            onSaved={(saved) => {
              setConfigs((rows) => sortAiConfigs(upsertAiConfig(rows, saved)));
              setEditing(null);
            }}
          />
        )}
      </div>
    </ThemeProvider>
  );
};
