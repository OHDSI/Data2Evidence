import type { PortalProps } from "../types/portal";

function getNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getAtlasStoredDatasetId(): string | undefined {
  if (typeof localStorage === "undefined") return undefined;

  try {
    return getNonEmptyString(localStorage.getItem("selectedVocabulary"));
  } catch {
    return undefined;
  }
}

/**
 * Normalize the host-specific dataset context consumed by Wizards.
 *
 * The portal already supplies datasetId directly. D2E WebAPI exposes Atlas
 * sources with sourceKey equal to the D2E dataset id, so an Atlas parcel can
 * use hostContext.sourceKey without another lookup or request interceptor. The
 * installed AnalysisHub does not yet pass sourceKey on initial mount, so use
 * Atlas's persisted vocabulary selection as a compatibility fallback.
 */
export function normalizeWizardPortalProps(props: PortalProps): PortalProps {
  const datasetId = getNonEmptyString(props.datasetId);
  if (datasetId) {
    return datasetId === props.datasetId ? props : { ...props, datasetId };
  }

  if (props.isAtlas !== true) return props;

  const sourceKey = getNonEmptyString(props.hostContext?.sourceKey) ?? getAtlasStoredDatasetId();
  return sourceKey ? { ...props, datasetId: sourceKey } : props;
}

// Atlas labels Wizard events with the manifest id but omits appId from the
// mount props. Portal supplies its generated appId, which must match exactly.
export function isWizardPropsChangeForApp(eventAppId: unknown, appId?: string): boolean {
  return eventAppId === (appId || "wizards");
}
