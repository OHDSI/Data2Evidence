import React, { FC, useEffect, useRef, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { ThemeProvider } from "@mui/material";
import {
  Alert,
  Button,
  Chip,
  Dialog,
  EmptyState,
  IconButton,
  Menu,
  PageHeader,
  Spinner,
  buildMuiTheme,
} from "ui-react";
import "ui-react/tokens.css";
import "ui-react/style.css";
import { api } from "../../../axios/api";
import { useFeedback, useTranslation } from "../../../contexts";
import { AiConfig } from "../../../types/aiConfig";
import { AiConfigDialog } from "./AiConfigDialog";
import { PendingBanner } from "./PendingBanner";
import { withNames } from "./withNames";
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
  const [confirm, setConfirm] = useState<{ kind: "activate" | "delete"; config: AiConfig; failed?: boolean } | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

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

  // Runs a confirmed write on the row `id`. Success closes the dialog with a toast. A stale row
  // (`_NOT_FOUND`, `_ACTIVE_DELETE`) closes it with an error toast, since a retry cannot succeed. Any other failure
  // keeps the dialog open in its failed state so the admin can try again.
  // `write` resolves to the success toast's phrase and the name to put in bold.
  const runConfirmed = async (id: number, write: () => Promise<[string, string]>) => {
    // A ref, not `busy`: state is stale between two clicks in the same render.
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const [phrase, name] = await write();
      setFeedback({
        type: "success",
        variant: "alert",
        autoClose: 5000,
        messageNode: withNames(phrase, [{ bold: name }]),
      });
      setConfirm(null);
    } catch (err: any) {
      const code = err?.data?.code;
      if (code === "AI_CONFIG_NOT_FOUND" || code === "AI_CONFIG_ACTIVE_DELETE") {
        // Drop the stale row locally, without re-listing.
        if (code === "AI_CONFIG_NOT_FOUND") setConfigs((rows) => rows.filter((r) => r.id !== id));
        setFeedback({
          type: "error",
          variant: "alert",
          message: getText(aiConfigErrorKey(code, i18nKeys, i18nKeys.AI_CONFIG__ACTION_ERROR)),
        });
        setConfirm(null);
      } else {
        setConfirm((c) => (c ? { ...c, failed: true } : c));
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
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
            showClose={!busy}
            title={
              busy
                ? getText(i18nKeys.AI_CONFIG__SWITCHING_TITLE)
                : confirm.failed
                ? getText(i18nKeys.AI_CONFIG__SWITCH_FAILED_TITLE)
                : getText(i18nKeys.AI_CONFIG__ACTIVATE_TITLE, [confirm.config.name])
            }
            closeLabel={getText(i18nKeys.AI_CONFIG__CLOSE)}
            onClose={() => setConfirm(null)}
            actions={
              <>
                <Button variant="secondary" disabled={busy} onClick={() => setConfirm(null)}>
                  {getText(i18nKeys.AI_CONFIG__CANCEL)}
                </Button>
                <Button disabled={busy} onClick={() => activate(confirm.config)}>
                  {busy
                    ? getText(i18nKeys.AI_CONFIG__SWITCHING_BUTTON)
                    : confirm.failed
                    ? getText(i18nKeys.AI_CONFIG__TRY_AGAIN)
                    : getText(i18nKeys.AI_CONFIG__SET_ACTIVE)}
                </Button>
              </>
            }
          >
            {busy ? (
              <>
                {withNames(getText(i18nKeys.AI_CONFIG__SWITCHING_BODY), [
                  { bold: currentActive?.name ?? "" },
                  { bold: confirm.config.name },
                  confirm.config.model,
                ])}
                <div className="ai-config__confirm-banner">
                  <PendingBanner>{getText(i18nKeys.AI_CONFIG__SWITCHING)}</PendingBanner>
                </div>
              </>
            ) : confirm.failed ? (
              <>
                {withNames(getText(i18nKeys.AI_CONFIG__SWITCH_FAILED_BODY), [{ bold: currentActive?.name ?? "" }])}
                <div className="ai-config__confirm-banner">
                  <Alert severity="error" variant="inline">
                    {getText(i18nKeys.AI_CONFIG__SWITCH_FAILED)}
                  </Alert>
                </div>
              </>
            ) : (
              getText(i18nKeys.AI_CONFIG__ACTIVATE_BODY, [
                currentActive?.name ?? "",
                confirm.config.name,
                confirm.config.model,
              ])
            )}
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
                  {getText(confirm.failed ? i18nKeys.AI_CONFIG__TRY_AGAIN : i18nKeys.AI_CONFIG__DELETE_CONFIRM)}
                </Button>
              </>
            }
          >
            {withNames(getText(i18nKeys.AI_CONFIG__DELETE_BODY), [{ bold: confirm.config.name }])}
            {confirm.failed && !busy ? (
              <div className="ai-config__confirm-banner">
                <Alert severity="error" variant="inline">
                  {getText(i18nKeys.AI_CONFIG__ACTION_ERROR)}
                </Alert>
              </div>
            ) : null}
          </Dialog>
        )}
      </div>
    </ThemeProvider>
  );
};
