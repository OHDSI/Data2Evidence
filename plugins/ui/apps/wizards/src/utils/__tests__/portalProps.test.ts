import { describe, expect, it } from "vitest";
import type { PortalProps } from "../../types/portal";
import { normalizeWizardPortalProps } from "../portalProps";

describe("normalizeWizardPortalProps", () => {
  it("preserves the dataset id supplied by the portal", () => {
    const props: PortalProps = {
      datasetId: "portal-dataset",
      isAtlas: false,
      hostContext: { sourceKey: "atlas-source" },
    };

    expect(normalizeWizardPortalProps(props)).toBe(props);
    expect(normalizeWizardPortalProps(props).datasetId).toBe("portal-dataset");
  });

  it("uses the Atlas source key as the D2E dataset id", () => {
    const props: PortalProps = {
      isAtlas: true,
      hostContext: { sourceKey: "dataset-from-atlas" },
    };

    expect(normalizeWizardPortalProps(props)).toEqual({
      ...props,
      datasetId: "dataset-from-atlas",
    });
  });

  it("resolves a new dataset id when Atlas updates the source key", () => {
    const initialProps = normalizeWizardPortalProps({
      isAtlas: true,
      hostContext: { sourceKey: "dataset-a" },
    });
    const updatedProps = normalizeWizardPortalProps({
      isAtlas: true,
      hostContext: { sourceKey: "dataset-b" },
    });

    expect(initialProps.datasetId).toBe("dataset-a");
    expect(updatedProps.datasetId).toBe("dataset-b");
  });

  it("does not treat an Atlas source key as a portal dataset id", () => {
    const props: PortalProps = {
      isAtlas: false,
      hostContext: { sourceKey: "atlas-source" },
    };

    expect(normalizeWizardPortalProps(props)).toBe(props);
    expect(normalizeWizardPortalProps(props).datasetId).toBeUndefined();
  });

  it("ignores empty Atlas source keys", () => {
    const props: PortalProps = {
      isAtlas: true,
      hostContext: { sourceKey: "   " },
    };

    expect(normalizeWizardPortalProps(props)).toBe(props);
  });
});
