import type { PortalProps } from "../types/portal";

function getNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Normalize the host-specific dataset context consumed by Wizards.
 *
 * The portal already supplies datasetId directly. D2E WebAPI exposes Atlas
 * sources with sourceKey equal to the D2E dataset id, so an Atlas parcel can
 * use hostContext.sourceKey without another lookup or request interceptor.
 */
export function normalizeWizardPortalProps(props: PortalProps): PortalProps {
  const datasetId = getNonEmptyString(props.datasetId);
  if (datasetId) {
    return datasetId === props.datasetId ? props : { ...props, datasetId };
  }

  if (props.isAtlas !== true) return props;

  const sourceKey = getNonEmptyString(props.hostContext?.sourceKey);
  return sourceKey ? { ...props, datasetId: sourceKey } : props;
}
