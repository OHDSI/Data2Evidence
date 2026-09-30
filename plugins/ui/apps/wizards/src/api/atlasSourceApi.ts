import client from "../axios/request";

export interface AtlasSource {
  sourceId: number;
  sourceKey: string;
  sourceName: string;
  sourceDialect: string;
}

interface AtlasSourceSelectionRuntime {
  setStoredSourceKey: (sourceKey: string) => void;
  dispatchPropsChange: (detail: { appId: string; datasetId: string }) => void;
}

function isAtlasSource(value: unknown): value is AtlasSource {
  if (!value || typeof value !== "object") return false;
  const source = value as Partial<AtlasSource>;
  return (
    typeof source.sourceId === "number" &&
    typeof source.sourceKey === "string" &&
    source.sourceKey.trim().length > 0 &&
    typeof source.sourceName === "string" &&
    typeof source.sourceDialect === "string"
  );
}

const STUDY_RESEARCHER_ROLE = "STUDY_RESEARCHER";

function getResearcherDatasetIds(value: unknown): Set<string> {
  const datasetRoles = (value as { datasetRoles?: unknown } | null)?.datasetRoles;
  if (!Array.isArray(datasetRoles)) {
    throw new Error("User management returned invalid user roles");
  }

  return new Set(
    datasetRoles
      .filter((datasetRole) => datasetRole?.role === STUDY_RESEARCHER_ROLE)
      .map((datasetRole) => datasetRole.datasetId)
      .filter((datasetId): datasetId is string => typeof datasetId === "string"),
  );
}

export async function listAtlasSources(getToken?: () => Promise<string>): Promise<AtlasSource[]> {
  const token = await getToken?.();
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  const [sourcesResponse, rolesResponse] = await Promise.all([
    client.get<unknown>("/WebAPI/source/sources", config),
    client.get<unknown>("/usermgmt/api/me/roles", config),
  ]);

  if (!Array.isArray(sourcesResponse.data)) {
    throw new Error("Atlas returned an invalid data-source list");
  }

  const researcherDatasetIds = getResearcherDatasetIds(rolesResponse.data);
  return sourcesResponse.data.filter(isAtlasSource).filter((source) => researcherDatasetIds.has(source.sourceKey));
}

export function resolveAtlasSourceKey(sources: AtlasSource[], selectedSourceKey?: string): string | undefined {
  const selectedSourceExists = sources.some((source) => source.sourceKey === selectedSourceKey);
  return selectedSourceExists ? selectedSourceKey : sources[0]?.sourceKey;
}

function getBrowserSelectionRuntime(): AtlasSourceSelectionRuntime | undefined {
  if (typeof window === "undefined") return undefined;

  return {
    setStoredSourceKey: (sourceKey) => {
      try {
        // Persist the choice for Atlas remounts/reloads. This does not update
        // Atlas's reactive source store in the current page.
        window.localStorage.setItem("selectedVocabulary", sourceKey);
      } catch {
        // The prop-change event still updates Wizards when storage is unavailable.
      }
    },
    dispatchPropsChange: (detail) => {
      // Notify the Wizard listener immediately. Atlas publishes the same event
      // for host source changes, but does not listen to Wizard-published events.
      window.dispatchEvent(new CustomEvent("custom-props-changed", { detail }));
    },
  };
}

export function publishAtlasSourceSelection(
  appId: string | undefined,
  sourceKey: string,
  runtime: AtlasSourceSelectionRuntime | undefined = getBrowserSelectionRuntime(),
): { appId: string; datasetId: string } {
  const detail = { appId: appId || "wizards", datasetId: sourceKey };
  runtime?.setStoredSourceKey(sourceKey);
  runtime?.dispatchPropsChange(detail);
  return detail;
}
