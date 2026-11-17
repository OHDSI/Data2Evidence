// panelOptions is a strict object in the config definition, so options that
// were removed from the definition must be dropped from stored configs
// before they are validated or saved. Kept in its own module (not config.ts)
// because importing config.ts needs the Postgres env vars, which tests lack.
const REMOVED_PANEL_OPTIONS = ["usePaAtlas"];

// Mutates and returns the given config.
export function stripRemovedOptions<T>(config: T): T {
    const panelOptions = (config as any)?.panelOptions;
    if (panelOptions && typeof panelOptions === "object") {
        for (const option of REMOVED_PANEL_OPTIONS) {
            delete panelOptions[option];
        }
    }
    return config;
}
