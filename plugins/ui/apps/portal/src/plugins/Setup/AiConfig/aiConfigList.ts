import { AiConfig } from "../../../types/aiConfig";

/** Active row first, then A-Z by name. The default compare keeps "Prod" and "prod" in a fixed order. */
export const sortAiConfigs = (configs: AiConfig[]): AiConfig[] =>
  [...configs].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name));

/** Replaces the row with the same id, or appends it when new. The caller sorts. */
export const upsertAiConfig = (configs: AiConfig[], saved: AiConfig): AiConfig[] =>
  configs.some((c) => c.id === saved.id) ? configs.map((c) => (c.id === saved.id ? saved : c)) : [...configs, saved];

/** `<key label> · <detail>` built from the stored fields; labels are passed in already translated. */
export const connectionSummary = (config: AiConfig, labels: { apiKey: string; workspace: string }): string => {
  const detail = (() => {
    switch (config.provider) {
      case "bedrock":
        return config.region;
      case "anthropic":
        return config.workspaceId ? `${labels.workspace} ${config.workspaceId}` : null;
      default:
        try {
          return config.baseUrl ? new URL(config.baseUrl).hostname : null;
        } catch {
          return config.baseUrl;
        }
    }
  })();
  return detail ? `${labels.apiKey} · ${detail}` : labels.apiKey;
};

/**
 * Which delete dialog a row opens: the active row among others (it asks for a replacement), or any other row.
 */
export const deleteVariant = (config: AiConfig, configs: AiConfig[]): "plain" | "active" =>
  config.isActive && configs.length > 1 ? "active" : "plain";

/** Maps a server error code (`AI_CONFIG_<SUFFIX>`) to its `AI_CONFIG__ERROR__<SUFFIX>` key, else the fallback. */
export const aiConfigErrorKey = <T extends Record<string, string>>(
  code: string | undefined,
  i18nKeys: T,
  fallback: T[keyof T]
): T[keyof T] => {
  const key = `AI_CONFIG__ERROR__${(code ?? "").replace(/^AI_CONFIG_/, "")}`;
  return key in i18nKeys ? (i18nKeys[key] as T[keyof T]) : fallback;
};
