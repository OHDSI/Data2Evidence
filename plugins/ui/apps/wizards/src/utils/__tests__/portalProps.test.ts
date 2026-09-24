import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PortalProps } from "../../types/portal";
import { isWizardPropsChangeForApp, normalizeWizardPortalProps } from "../portalProps";

describe("normalizeWizardPortalProps", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("uses Atlas's persisted vocabulary source on initial mount", () => {
    localStorage.setItem("selectedVocabulary", "stored-atlas-dataset");

    expect(normalizeWizardPortalProps({ isAtlas: true }).datasetId).toBe("stored-atlas-dataset");
  });

  it("prefers the Atlas host context over the persisted vocabulary source", () => {
    localStorage.setItem("selectedVocabulary", "stored-atlas-dataset");

    expect(
      normalizeWizardPortalProps({
        isAtlas: true,
        hostContext: { sourceKey: "host-atlas-dataset" },
      }).datasetId,
    ).toBe("host-atlas-dataset");
  });

  it("uses the authenticated Atlas username when the parcel omits the top-level username", () => {
    expect(
      normalizeWizardPortalProps({
        isAtlas: true,
        authContext: { user: { username: "atlas-researcher" } },
      }).username,
    ).toBe("atlas-researcher");
  });

  // THE OWNERSHIP KEY. parseCandidate rejects any bookmark whose `user_id` is
  // not this string, and `user_id` is usermgmt's username -- which the login
  // bridge stores here. authContext's comes from the ID token, which under
  // trex's provider carries no `username` claim and degrades to the
  // synthesised <username>@d2e.local; preferring it hides the user's own
  // saved work.
  it("prefers the username the login bridge read from usermgmt over the token's", () => {
    localStorage.setItem("atlas_username", "brandan");

    expect(
      normalizeWizardPortalProps({
        isAtlas: true,
        authContext: { user: { username: "brandan@d2e.local" } },
      }).username,
    ).toBe("brandan");
  });

  it("still falls back to the token's username when nothing was stored", () => {
    expect(
      normalizeWizardPortalProps({
        isAtlas: true,
        authContext: { user: { username: "atlas-researcher" } },
      }).username,
    ).toBe("atlas-researcher");
  });

  // The portal supplies its own, already read from usermgmt, and it wins: a
  // stale key left in localStorage by an earlier Atlas session must not rename
  // the signed-in user.
  it("keeps the portal's username ahead of a stored Atlas one", () => {
    localStorage.setItem("atlas_username", "somebody-else");

    expect(
      normalizeWizardPortalProps({
        isAtlas: true,
        username: "brandan",
        authContext: { user: { username: "brandan@d2e.local" } },
      }).username,
    ).toBe("brandan");
  });

  it("preserves the username supplied directly by the portal", () => {
    const props: PortalProps = {
      username: "portal-researcher",
      isAtlas: false,
      authContext: { user: { username: "atlas-researcher" } },
    };

    expect(normalizeWizardPortalProps(props)).toBe(props);
    expect(normalizeWizardPortalProps(props).username).toBe("portal-researcher");
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

  it("matches Atlas prop changes when Atlas omits the app id", () => {
    expect(isWizardPropsChangeForApp("wizards")).toBe(true);
    expect(isWizardPropsChangeForApp("another-app")).toBe(false);
  });

  it("uses the Portal app id when one is supplied", () => {
    expect(isWizardPropsChangeForApp("portal-wizards", "portal-wizards")).toBe(true);
    expect(isWizardPropsChangeForApp("wizards", "portal-wizards")).toBe(false);
  });
});
