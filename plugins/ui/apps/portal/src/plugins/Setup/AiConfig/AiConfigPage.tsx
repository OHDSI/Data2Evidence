import React, { FC, useEffect, useRef, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { ThemeProvider } from "@mui/material";
import { Button, Chip, Dialog, EmptyState, IconButton, Menu, PageHeader, Spinner, buildMuiTheme } from "ui-react";
import "ui-react/tokens.css";
import "ui-react/style.css";
import { api } from "../../../axios/api";
import { useFeedback, useTranslation } from "../../../contexts";
import { AiConfig } from "../../../types/aiConfig";
import { AiConfigDialog } from "./AiConfigDialog";
import { aiConfigErrorKey, canDeleteAiConfig, connectionSummary, sortAiConfigs, upsertAiConfig } from "./aiConfigList";
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
  const [confirm, setConfirm] = useState<{ kind: "activate" | "delete"; config: AiConfig } | null>(null);
  const [busy, setBusy] = useState(false);

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

  // The name is a React child, never HTML, so markup in a name renders as text.
  const withBoldName = (phrase: string, name: string) => {
    const [before, after] = phrase.split("{0}");
    return (
      <>
        {before}
        <strong>{name}</strong>
        {after}
      </>
    );
  };

  // Runs a confirmed write on the row `id`. Failures show as an error toast; the dialog closes either way.
  // `write` resolves to the success toast's phrase and the name to put in bold.
  const runConfirmed = async (id: number, write: () => Promise<[string, string]>) => {
    setBusy(true);
    try {
      const [phrase, name] = await write();
      setFeedback({ type: "success", variant: "alert", autoClose: 5000, messageNode: withBoldName(phrase, name) });
    } catch (err: any) {
      const code = err?.data?.code;
      // Another admin already deleted it: drop the stale row locally, without re-listing.
      if (code === "AI_CONFIG_NOT_FOUND") setConfigs((rows) => rows.filter((r) => r.id !== id));
      setFeedback({
        type: "error",
        variant: "alert",
        message: getText(aiConfigErrorKey(code, i18nKeys, i18nKeys.AI_CONFIG__ACTION_ERROR)),
      });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const activate = (config: AiConfig) =>
    runConfirmed(config.id, async () => {
      const activated = await api.systemPortal.activateAiConfig(config.id);
      setConfigs((rows) =>
        sortAiConfigs(
          upsertAiConfig(
            rows.map((r) => ({ ...r, isActive: false })),
            activated
          )
        )
      );
      return [getText(i18nKeys.AI_CONFIG__ACTIVATED_TOAST), activated.name];
    });

  const remove = (config: AiConfig) =>
    runConfirmed(config.id, async () => {
      await api.systemPortal.deleteAiConfig(config.id);
      setConfigs((rows) => rows.filter((r) => r.id !== config.id));
      return [getText(i18nKeys.AI_CONFIG__DELETED_TOAST), config.name];
    });

  const currentActive = configs.find((c) => c.isActive);

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
              {configs.map((config) => {
                const deletable = canDeleteAiConfig(config, configs);
                return (
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
                      <Menu
                        width={220}
                        items={[
                          ...(config.isActive
                            ? []
                            : [{ label: getText(i18nKeys.AI_CONFIG__SET_ACTIVE), value: "activate" }]),
                          {
                            label: getText(i18nKeys.AI_CONFIG__DELETE),
                            value: "delete",
                            danger: true,
                            disabled: !deletable,
                            tooltip: deletable ? undefined : getText(i18nKeys.AI_CONFIG__DELETE_DISABLED_HINT),
                          },
                        ]}
                        onSelect={(kind) => setConfirm({ kind: kind as "activate" | "delete", config })}
                        activator={({ open }) => (
                          <IconButton
                            ariaLabel={`${getText(i18nKeys.AI_CONFIG__MORE_ACTIONS)} ${config.name}`}
                            icon={<MoreVertIcon />}
                            onClick={open}
                          />
                        )}
                      />
                    </div>
                  </li>
                );
              })}
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
            // Another admin deleted it: drop the stale row and tell the admin, as the confirm dialogs do.
            onNotFound={() => {
              setConfigs((rows) => rows.filter((r) => r.id !== editing.id));
              setEditing(null);
              setFeedback({ type: "error", variant: "alert", message: getText(i18nKeys.AI_CONFIG__ERROR__NOT_FOUND) });
            }}
            onSaved={(saved) => {
              setConfigs((rows) => sortAiConfigs(upsertAiConfig(rows, saved)));
              setEditing(null);
            }}
          />
        )}
        {confirm?.kind === "activate" && (
          <Dialog
            open
            size="s"
            busy={busy}
            title={getText(i18nKeys.AI_CONFIG__ACTIVATE_TITLE, [confirm.config.name])}
            closeLabel={getText(i18nKeys.AI_CONFIG__CLOSE)}
            onClose={() => setConfirm(null)}
            actions={
              <>
                <Button variant="secondary" disabled={busy} onClick={() => setConfirm(null)}>
                  {getText(i18nKeys.AI_CONFIG__CANCEL)}
                </Button>
                <Button loading={busy} onClick={() => activate(confirm.config)}>
                  {getText(i18nKeys.AI_CONFIG__SET_ACTIVE)}
                </Button>
              </>
            }
          >
            {getText(i18nKeys.AI_CONFIG__ACTIVATE_BODY, [
              currentActive?.name ?? "",
              confirm.config.name,
              confirm.config.model,
            ])}
          </Dialog>
        )}
        {confirm?.kind === "delete" && (
          <Dialog
            open
            size="s"
            busy={busy}
            title={getText(i18nKeys.AI_CONFIG__DELETE_TITLE)}
            closeLabel={getText(i18nKeys.AI_CONFIG__CLOSE)}
            onClose={() => setConfirm(null)}
            actions={
              <>
                <Button variant="secondary" disabled={busy} onClick={() => setConfirm(null)}>
                  {getText(i18nKeys.AI_CONFIG__CANCEL)}
                </Button>
                <Button variant="danger" loading={busy} onClick={() => remove(confirm.config)}>
                  {getText(i18nKeys.AI_CONFIG__DELETE_CONFIRM)}
                </Button>
              </>
            }
          >
            {withBoldName(getText(i18nKeys.AI_CONFIG__DELETE_BODY), confirm.config.name)}
          </Dialog>
        )}
      </div>
    </ThemeProvider>
  );
};
