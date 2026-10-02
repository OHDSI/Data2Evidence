import { mountRootParcel } from "single-spa";
import type { ParcelConfig } from "single-spa";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { keepMountPropsOnUpdate } from "../parcelLifecycles";

// single-spa chooses its CustomEvent fallback when it loads. Node 18 has no
// native CustomEvent, so give it the document.createEvent path before import.
vi.hoisted(() => {
  if (typeof globalThis.CustomEvent === "undefined") {
    Object.assign(globalThis, { document: { createEvent: () => ({ initCustomEvent: () => undefined }) } });
  }
});

type Props = Record<string, unknown> & { name?: string };

// single-spa only checks that a parcel has a domElement; the lifecycles here
// are mocks and render nothing, so no DOM is needed.
const PARCEL_HOST = {} as HTMLElement;

function createLifecycles() {
  return {
    bootstrap: vi.fn(async (_props: Props) => undefined),
    mount: vi.fn(async (_props: Props) => undefined),
    unmount: vi.fn(async (_props: Props) => undefined),
    update: vi.fn(async (_props: Props) => undefined),
  };
}

// Run the wrapper through single-spa itself, the way Atlas3 mounts the Wizard:
// mountRootParcel with the full props, then handle.update({ hostContext }) with
// no name. single-spa gives every lifecycle call the parcel's own name.
describe("keepMountPropsOnUpdate with single-spa parcels", () => {
  // single-spa dispatches its first-mount events on window. Nothing listens here.
  beforeAll(() => {
    vi.stubGlobal("window", { dispatchEvent: () => true });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the mount props when the host updates with hostContext only", async () => {
    const inner = createLifecycles();
    const getToken = async () => "token";
    const handle = mountRootParcel(keepMountPropsOnUpdate(inner) as unknown as ParcelConfig, {
      domElement: PARCEL_HOST,
      name: "Wizard",
      appId: "wizards",
      isAtlas: true,
      getToken,
      hostContext: { surface: "analysis-tabs", locale: "en" },
    });
    await handle.mountPromise;

    await handle.update?.({ hostContext: { surface: "analysis-tabs", locale: "de" } });

    const mountProps = inner.mount.mock.calls[0][0];
    const updateProps = inner.update.mock.calls[0][0];
    expect(updateProps.name).toBe(mountProps.name);
    expect(updateProps).toMatchObject({
      appId: "wizards",
      isAtlas: true,
      getToken,
      hostContext: { surface: "analysis-tabs", locale: "de" },
    });

    await handle.unmount();
    expect(inner.unmount.mock.calls[0][0]).toMatchObject({ isAtlas: true, appId: "wizards" });
  });

  it("loses the mount props without the wrapper", async () => {
    const inner = createLifecycles();
    const handle = mountRootParcel(inner as unknown as ParcelConfig, {
      domElement: PARCEL_HOST,
      isAtlas: true,
      hostContext: { locale: "en" },
    });
    await handle.mountPromise;

    await handle.update?.({ hostContext: { locale: "de" } });

    expect(inner.update.mock.calls[0][0].isAtlas).toBeUndefined();
    await handle.unmount();
  });
});
