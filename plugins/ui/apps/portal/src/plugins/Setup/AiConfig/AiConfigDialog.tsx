import React, { FC, useState } from "react";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { Alert, Button, Dialog, IconButton, Select, TextField } from "ui-react";
import { api } from "../../../axios/api";
import { useTranslation } from "../../../contexts";
import { AiConfig, AiConfigInput, AiConfigProvider } from "../../../types/aiConfig";
import { aiConfigErrorKey } from "./aiConfigList";
import "./AiConfigDialog.scss";

const KEY_PLACEHOLDER = "***REDACTED***";
const DEFAULT_NAME = "AI Configuration 1";

type FieldName = "baseUrl" | "apiKey" | "model" | "region" | "workspaceId";

// Figma order of the CONFIGURATION section for each provider; Model sits inside it.
const PROVIDER_FIELDS: Record<AiConfigProvider, FieldName[]> = {
  "openai-compatible": ["baseUrl", "apiKey", "model"],
  anthropic: ["apiKey", "model", "workspaceId"],
  bedrock: ["apiKey", "region", "model"],
};

const isHttpUrl = (value: string) => {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

interface Props {
  /** Edit this configuration; omit to add a new one. */
  config?: AiConfig;
  onClose: () => void;
  /** Called with the write response once the save succeeded. */
  onSaved: (config: AiConfig) => void;
}

interface SaveError {
  code?: string;
  field?: string;
}

export const AiConfigDialog: FC<Props> = ({ config, onClose, onSaved }) => {
  const { getText, i18nKeys } = useTranslation();

  const [name, setName] = useState(config?.name ?? DEFAULT_NAME);
  const [provider, setProvider] = useState<AiConfigProvider | "">(config?.provider ?? "");
  const [baseUrl, setBaseUrl] = useState(config?.baseUrl ?? "");
  const [region, setRegion] = useState(config?.region ?? "");
  const [workspaceId, setWorkspaceId] = useState(config?.workspaceId ?? "");
  const [model, setModel] = useState(config?.model ?? "");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<SaveError | null>(null);
  // Fields the admin has left once; a required message never shows before that.
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const touch = (field: string) => () => setTouched((prev) => new Set(prev).add(field));

  const edit = (setter: (value: string) => void) => (value: string) => {
    setError(null);
    setter(value);
  };

  // The stored key may be reused only while the destination (provider, base URL) is unchanged.
  const keepable =
    config != null &&
    config.keyReadable !== false &&
    provider === config.provider &&
    (provider !== "openai-compatible" || baseUrl.trim() === (config.baseUrl ?? ""));
  const keyGiven = apiKey.trim() !== "";

  const fields = provider ? PROVIDER_FIELDS[provider] : [];
  const baseUrlInvalid = provider === "openai-compatible" && baseUrl.trim() !== "" && !isHttpUrl(baseUrl.trim());
  const canSave =
    name.trim() !== "" &&
    provider !== "" &&
    model.trim() !== "" &&
    (keyGiven || keepable) &&
    (provider !== "bedrock" || region.trim() !== "") &&
    (provider !== "openai-compatible" || (baseUrl.trim() !== "" && !baseUrlInvalid));

  const save = async () => {
    if (!provider || !canSave) return;
    const body: AiConfigInput = {
      name: name.trim(),
      provider,
      model: model.trim(),
      // The backend rejects the placeholder on create, so it is only ever sent on update.
      apiKey: keyGiven ? apiKey.trim() : KEY_PLACEHOLDER,
    };
    if (provider === "openai-compatible") body.baseUrl = baseUrl.trim();
    if (provider === "bedrock") body.region = region.trim();
    if (provider === "anthropic") body.workspaceId = workspaceId.trim() || null;

    setSaving(true);
    setError(null);
    try {
      const saved = config
        ? await api.systemPortal.updateAiConfig(config.id, body)
        : await api.systemPortal.createAiConfig(body);
      onSaved(saved);
    } catch (err: any) {
      // The rejection holds the request body (with the API key), so only the code and field are read from it.
      const data = typeof err === "object" && err !== null ? err.data : undefined;
      setError({ code: data?.code, field: data?.field });
    } finally {
      setSaving(false);
    }
  };

  const errorText = error ? getText(aiConfigErrorKey(error.code, i18nKeys, i18nKeys.AI_CONFIG__ERROR__GENERIC)) : "";
  const inlineField =
    error && (error.code === "AI_CONFIG_INVALID" || error.code === "AI_CONFIG_DUPLICATE") ? error.field : undefined;
  const fieldError = (field: string) => (inlineField === field ? errorText : undefined);
  // A server error on the field wins over the required message.
  const fieldMessage = (field: string, empty: boolean, requiredKey: keyof typeof i18nKeys) =>
    fieldError(field) ?? (touched.has(field) && empty ? getText(i18nKeys[requiredKey]) : undefined);
  const dialogError =
    error &&
    (!inlineField ||
      (inlineField !== "name" && inlineField !== "provider" && !fields.includes(inlineField as FieldName)));

  const keyLabel = {
    "openai-compatible": "AI_CONFIG__API_KEY_LABEL",
    anthropic: "AI_CONFIG__ANTHROPIC_API_KEY_LABEL",
    bedrock: "AI_CONFIG__BEDROCK_API_KEY_LABEL",
  } as const;

  const renderField = (field: FieldName) => {
    switch (field) {
      case "baseUrl":
        return (
          <TextField
            key={field}
            inputProps={{ "aria-required": true }}
            label={getText(i18nKeys.AI_CONFIG__BASE_URL_LABEL)}
            value={baseUrl}
            onChange={edit(setBaseUrl)}
            onBlur={touch("baseUrl")}
            hint={getText(i18nKeys.AI_CONFIG__BASE_URL_HINT)}
            errorMessages={
              fieldError("baseUrl") ??
              (baseUrlInvalid
                ? getText(i18nKeys.AI_CONFIG__BASE_URL_INVALID)
                : fieldMessage("baseUrl", baseUrl.trim() === "", "AI_CONFIG__REQUIRED_BASE_URL"))
            }
          />
        );
      case "apiKey": {
        const hint = keyGiven
          ? undefined
          : config?.keyReadable === false
          ? getText(i18nKeys.AI_CONFIG__API_KEY_UNREADABLE_HINT)
          : keepable
          ? getText(i18nKeys.AI_CONFIG__API_KEY_KEEP_HINT)
          : config
          ? getText(i18nKeys.AI_CONFIG__API_KEY_REENTER_HINT)
          : undefined;
        return (
          <TextField
            key={field}
            label={getText(i18nKeys[keyLabel[provider as AiConfigProvider]])}
            inputProps={{ "aria-required": true }}
            type={showKey ? "text" : "password"}
            autoComplete="new-password"
            value={apiKey}
            onChange={edit(setApiKey)}
            onBlur={touch("apiKey")}
            // The saved key is never put into the input; the keep hint explains the empty field.
            hint={hint}
            errorMessages={fieldMessage("apiKey", !keyGiven && !keepable, "AI_CONFIG__REQUIRED_API_KEY")}
            InputProps={{
              endAdornment: (
                <IconButton
                  size="sm"
                  ariaLabel={showKey ? getText(i18nKeys.AI_CONFIG__HIDE_KEY) : getText(i18nKeys.AI_CONFIG__SHOW_KEY)}
                  onClick={() => setShowKey((shown) => !shown)}
                >
                  {showKey ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              ),
            }}
          />
        );
      }
      case "model":
        return (
          <TextField
            key={field}
            inputProps={{ "aria-required": true }}
            label={getText(i18nKeys.AI_CONFIG__MODEL_LABEL)}
            value={model}
            onChange={edit(setModel)}
            onBlur={touch("model")}
            errorMessages={fieldMessage("model", model.trim() === "", "AI_CONFIG__REQUIRED_MODEL")}
          />
        );
      case "region":
        return (
          <TextField
            key={field}
            inputProps={{ "aria-required": true }}
            label={getText(i18nKeys.AI_CONFIG__REGION_LABEL)}
            value={region}
            onChange={edit(setRegion)}
            onBlur={touch("region")}
            hint={getText(i18nKeys.AI_CONFIG__REGION_HINT)}
            errorMessages={fieldMessage("region", region.trim() === "", "AI_CONFIG__REQUIRED_REGION")}
          />
        );
      case "workspaceId":
        return (
          <TextField
            key={field}
            label={getText(i18nKeys.AI_CONFIG__WORKSPACE_ID_LABEL)}
            value={workspaceId}
            onChange={edit(setWorkspaceId)}
            hint={getText(i18nKeys.AI_CONFIG__WORKSPACE_ID_HINT)}
            errorMessages={fieldError("workspaceId")}
          />
        );
    }
  };

  return (
    <Dialog
      open
      size="s"
      title={config ? getText(i18nKeys.AI_CONFIG__EDIT_TITLE) : getText(i18nKeys.AI_CONFIG__ADD_TITLE)}
      closeLabel={getText(i18nKeys.AI_CONFIG__CLOSE)}
      busy={saving}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            {getText(i18nKeys.AI_CONFIG__CANCEL)}
          </Button>
          <Button disabled={!canSave || Boolean(inlineField && !dialogError)} loading={saving} onClick={save}>
            {getText(i18nKeys.AI_CONFIG__SAVE)}
          </Button>
        </>
      }
    >
      <div className="ai-config-dialog">
        {dialogError ? (
          <Alert severity="error" variant="inline">
            {errorText}
          </Alert>
        ) : null}
        <TextField
          inputProps={{ "aria-required": true }}
          label={getText(i18nKeys.AI_CONFIG__NAME_LABEL)}
          value={name}
          onChange={edit(setName)}
          onBlur={touch("name")}
          errorMessages={fieldMessage("name", name.trim() === "", "AI_CONFIG__REQUIRED_NAME")}
        />
        <Select
          required
          label={getText(i18nKeys.AI_CONFIG__PROVIDER_LABEL)}
          value={provider || null}
          onChange={(value) => {
            setError(null);
            setProvider(value as AiConfigProvider);
          }}
          items={[
            { value: "bedrock", label: getText(i18nKeys.AI_CONFIG__PROVIDER_BEDROCK) },
            { value: "openai-compatible", label: getText(i18nKeys.AI_CONFIG__PROVIDER_OPENAI_COMPATIBLE) },
            { value: "anthropic", label: getText(i18nKeys.AI_CONFIG__PROVIDER_ANTHROPIC) },
          ]}
          errorMessages={fieldError("provider")}
        />
        <section className="ai-config-dialog__section">
          <div className="ai-config-dialog__section-header">
            <span>{getText(i18nKeys.AI_CONFIG__SECTION_CONFIGURATION)}</span>
          </div>
          {provider ? (
            fields.map(renderField)
          ) : (
            <p className="ai-config-dialog__empty">{getText(i18nKeys.AI_CONFIG__CHOOSE_PROVIDER_FIRST)}</p>
          )}
        </section>
      </div>
    </Dialog>
  );
};
