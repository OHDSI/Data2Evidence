import { describe, expect, it, vi } from "vitest";
import { keepMountPropsOnUpdate } from "../parcelLifecycles";

type Props = Record<string, unknown> & { name?: string };

function createLifecycles() {
  return {
    bootstrap: vi.fn(async (_props: Props) => undefined),
    mount: vi.fn(async (_props: Props) => undefined),
    unmount: vi.fn(async (_props: Props) => undefined),
    update: vi.fn(async (_props: Props) => undefined),
  };
}

const getToken = async () => "token";
const atlasMountProps: Props = {
  name: "parcel-0",
  appId: "wizards",
  isAtlas: true,
  getToken,
  hostContext: { surface: "analysis-tabs", itemId: "wizards", locale: "en" },
};

describe("keepMountPropsOnUpdate", () => {
  it("keeps the mount props when an update sends only hostContext", async () => {
    const inner = createLifecycles();
    const lifecycles = keepMountPropsOnUpdate(inner);

    await lifecycles.mount(atlasMountProps);
    // Atlas3 updates with { hostContext } only, and single-spa replaces parcel
    // props on update. Without the merge the Wizard loses isAtlas and getToken.
    const nextHostContext = { surface: "analysis-tabs", itemId: "wizards", locale: "de" };
    await lifecycles.update({ name: "parcel-0", hostContext: nextHostContext });

    expect(inner.update).toHaveBeenCalledWith({
      ...atlasMountProps,
      hostContext: nextHostContext,
    });
  });

  it("keeps the latest values across more than one update", async () => {
    const inner = createLifecycles();
    const lifecycles = keepMountPropsOnUpdate(inner);

    await lifecycles.mount(atlasMountProps);
    await lifecycles.update({ name: "parcel-0", hostContext: { sourceKey: "dataset-a" } });
    await lifecycles.update({ name: "parcel-0", locale: "de" });

    expect(inner.update).toHaveBeenLastCalledWith({
      ...atlasMountProps,
      hostContext: { sourceKey: "dataset-a" },
      locale: "de",
    });
  });

  it("gives unmount the merged props, then forgets them", async () => {
    const inner = createLifecycles();
    const lifecycles = keepMountPropsOnUpdate(inner);

    await lifecycles.mount(atlasMountProps);
    await lifecycles.update({ name: "parcel-0", hostContext: { sourceKey: "dataset-a" } });
    await lifecycles.unmount({ name: "parcel-0", hostContext: { sourceKey: "dataset-a" } });

    expect(inner.unmount).toHaveBeenCalledWith({
      ...atlasMountProps,
      hostContext: { sourceKey: "dataset-a" },
    });

    await lifecycles.mount({ name: "parcel-0", isAtlas: false });
    await lifecycles.update({ name: "parcel-0", locale: "en" });

    expect(inner.update).toHaveBeenLastCalledWith({ name: "parcel-0", isAtlas: false, locale: "en" });
  });

  it("keeps the props of each parcel apart", async () => {
    const inner = createLifecycles();
    const lifecycles = keepMountPropsOnUpdate(inner);

    await lifecycles.mount(atlasMountProps);
    await lifecycles.mount({ name: "parcel-1", appId: "wizards", isAtlas: false });
    await lifecycles.update({ name: "parcel-1", locale: "en" });

    expect(inner.update).toHaveBeenLastCalledWith({
      name: "parcel-1",
      appId: "wizards",
      isAtlas: false,
      locale: "en",
    });
  });

  it("passes bootstrap and mount through unchanged", async () => {
    const inner = createLifecycles();
    const lifecycles = keepMountPropsOnUpdate(inner);

    await lifecycles.bootstrap(atlasMountProps);
    await lifecycles.mount(atlasMountProps);

    expect(inner.bootstrap).toHaveBeenCalledWith(atlasMountProps);
    expect(inner.mount).toHaveBeenCalledWith(atlasMountProps);
  });
});
