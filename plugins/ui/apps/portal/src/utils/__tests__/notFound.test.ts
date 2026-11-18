import { NOT_FOUND_URL, isSingleSpaAppRoute, isUnderPortalBasename, redirectToNotFound } from "../notFound";

describe("isUnderPortalBasename", () => {
  it("accepts the portal's own URLs", () => {
    expect(isUnderPortalBasename("/d2e/portal")).toBe(true);
    expect(isUnderPortalBasename("/d2e/portal/")).toBe(true);
    expect(isUnderPortalBasename("/d2e/portal/researcher/overview")).toBe(true);
  });

  it("rejects the /portal/* alias the router cannot handle (#2261)", () => {
    expect(isUnderPortalBasename("/portal/researcher")).toBe(false);
    expect(isUnderPortalBasename("/portal")).toBe(false);
  });

  it("rejects paths that only start with the same letters", () => {
    expect(isUnderPortalBasename("/d2e/portalx")).toBe(false);
  });
});

describe("isSingleSpaAppRoute", () => {
  const apps = ["notebook", "jobs"];

  it("matches a single-spa app's page and its sub-pages", () => {
    expect(isSingleSpaAppRoute("/researcher/notebook", "researcher", apps)).toBe(true);
    expect(isSingleSpaAppRoute("/systemadmin/jobs/flow-runs/123", "systemadmin", apps)).toBe(true);
  });

  it("does not match URLs no app owns", () => {
    expect(isSingleSpaAppRoute("/researcher/abc", "researcher", apps)).toBe(false);
    expect(isSingleSpaAppRoute("/researcher/abc", "researcher", [])).toBe(false);
  });

  it("only matches inside the given section", () => {
    expect(isSingleSpaAppRoute("/etl/notebook", "researcher", apps)).toBe(false);
  });
});

describe("redirectToNotFound", () => {
  const original = window.location;

  afterEach(() => {
    (window as any).location = original;
  });

  it("replaces the current URL with the Atlas3 not-found page", () => {
    const replace = jest.fn();
    delete (window as any).location;
    (window as any).location = { replace };

    redirectToNotFound();

    expect(replace).toHaveBeenCalledWith(NOT_FOUND_URL);
    expect(NOT_FOUND_URL).toBe("/atlas/#/plugins/not-found/");
  });
});
