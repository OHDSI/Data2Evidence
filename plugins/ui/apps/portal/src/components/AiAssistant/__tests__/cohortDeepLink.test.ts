import { resolveAssistantHref } from "../cohortDeepLink";

// jsdom serves the tests from http://localhost/, which stands in for whatever origin the
// portal is deployed on.
const ORIGIN = "http://localhost";
const QUERY = "?datasetId=abc-123&linkType=cohort-definition&query=eJyrVkrLzE0s";

describe("resolveAssistantHref", () => {
  it("rebuilds a deep link the model turned into a hostname", () => {
    // The failure this exists for: `/d2e/portal/…` relayed as `https://d2e/portal/…`.
    expect(resolveAssistantHref(`https://d2e/portal/researcher/cohort${QUERY}`)).toBe(
      `${ORIGIN}/d2e/portal/researcher/cohort${QUERY}`
    );
  });

  it("leaves an already-correct deep link pointing at the same place", () => {
    expect(resolveAssistantHref(`/d2e/portal/researcher/cohort${QUERY}`)).toBe(
      `${ORIGIN}/d2e/portal/researcher/cohort${QUERY}`
    );
  });

  it("restores the base path when the model drops it", () => {
    expect(resolveAssistantHref(`/researcher/cohort${QUERY}`)).toBe(`${ORIGIN}/d2e/portal/researcher/cohort${QUERY}`);
  });

  it("resolves a base-relative deep link", () => {
    expect(resolveAssistantHref(`researcher/cohort${QUERY}`)).toBe(`${ORIGIN}/d2e/portal/researcher/cohort${QUERY}`);
  });

  it("keeps the query byte for byte — it is the compressed cohort", () => {
    const compressed = "?datasetId=d1&linkType=cohort-definition&query=eJyrVkrLzE0s-_-Ab_c";
    expect(resolveAssistantHref(`https://d2e/portal/researcher/cohort${compressed}`)).toBe(
      `${ORIGIN}/d2e/portal/researcher/cohort${compressed}`
    );
  });

  it("leaves other links alone", () => {
    expect(resolveAssistantHref("https://athena.ohdsi.org/search-terms/terms/201826")).toBe(
      "https://athena.ohdsi.org/search-terms/terms/201826"
    );
    expect(resolveAssistantHref("/d2e/portal/researcher/datasets")).toBe("/d2e/portal/researcher/datasets");
  });

  it("passes through anything that is not a URL", () => {
    expect(resolveAssistantHref("")).toBe("");
    expect(resolveAssistantHref("not a url at all")).toBe("not a url at all");
  });
});
