import { env } from "../env";
import { extractConfigStamp, type ConfigStamp } from "../lib/cohortBuilder";

/**
 * Thin client for analytics-svc, used to fetch the PA config stamp
 * (configId + configVersion) a cohort bookmark must be stamped with.
 *
 * Mirrors the Trex-channel pattern of bookmark-svc's AnalyticsSvcAPI and
 * mcp-server's WebAPIAPI: one tokio channel + SERVICE_ROUTES base URL.
 *
 * getMyConfig hits the PA endpoint that dispatches `action=getMyConfig`
 * (analytics-svc/src/main.ts:218-293), reading datasetId from the query string
 * and returning the config object whose `meta` carries the stamp
 * (alp-config-utils mriConfigConnection — meta.configId / meta.configVersion).
 */
export class AnalyticsAPI {
  private readonly channel: any;
  private readonly baseURL: string;

  constructor() {
    if (!env.SERVICE_ROUTES.analytics) {
      throw new Error("No url is set for analytics-svc (SERVICE_ROUTES.analytics)");
    }
    this.baseURL = env.SERVICE_ROUTES.analytics;
    // @ts-ignore Trex global injected by the host runtime
    this.channel = Trex.tokioChannel("d2e-functions/analytics-svc");
  }

  /**
   * Fetch the PA config stamp for a dataset. Returns null when the dataset has
   * no PA config, so the caller can emit an LLM-actionable error.
   */
  async getConfigStamp(
    authorization: string,
    datasetId: string,
  ): Promise<ConfigStamp | null> {
    const url =
      `${this.baseURL}/analytics-svc/pa/services/analytics.xsjs` +
      `?action=getMyConfig&datasetId=${encodeURIComponent(datasetId)}`;
    const options = {
      headers: { Authorization: authorization },
      timeout: 20000,
    };

    let response: any;
    try {
      console.log(`[cohort-builder] getConfigStamp GET ${url}`);
      response = await this.channel.get(url, options);
    } catch (error) {
      console.error(
        `[cohort-builder] getConfigStamp request failed for ${url}: ${error}`,
      );
      throw error;
    }

    const data = response?.data;

    // Diagnostic: how many configs came back, which one we pick, and whether it
    // actually contains the Age/Gender attributes our bookmark references. A
    // config that names these differently (or a wrong list entry) is why a card
    // fails to restore on some datasets even though the link is valid.
    if (Array.isArray(data)) {
      const chosen: any = data[0];
      const attrKeys = Object.keys(chosen?.config?.patient?.attributes ?? {});
      console.log(
        `[cohort-builder] getConfigStamp: ${data.length} config(s); chosen ` +
          `configId=${chosen?.meta?.configId} version=${chosen?.meta?.configVersion}; ` +
          `patient.attributes keys=${JSON.stringify(attrKeys)}; ` +
          `hasAge=${attrKeys.includes("Age")} hasGender=${attrKeys.includes("Gender_concept_name")}`,
      );
    }

    const stamp = extractConfigStamp(data);
    if (!stamp) {
      // Log the actual shape so we can see where the stamp really lives.
      console.error(
        `[cohort-builder] getConfigStamp: no meta.configId/configVersion in response. ` +
          `status=${response?.status} isArray=${Array.isArray(data)} ` +
          `data=${JSON.stringify(data)?.slice(0, 500)}`,
      );
      return null;
    }
    return stamp;
  }

  /**
   * Fetch the full PA frontend config for a dataset: the same getMyConfig
   * `{ config, meta }` the PA UI loads, where `config.patient` carries the
   * filter cards and attributes. The cohort catalog is built from this exact
   * object, so what we expose matches what the loader will accept.
   *
   * Returns null when the dataset has no PA config, so the caller can emit an
   * LLM-actionable error instead of an empty catalog.
   */
  async getFrontendConfig(
    authorization: string,
    datasetId: string,
  ): Promise<{ config: any; meta: ConfigStamp } | null> {
    const url =
      `${this.baseURL}/analytics-svc/pa/services/analytics.xsjs` +
      `?action=getMyConfig&datasetId=${encodeURIComponent(datasetId)}`;
    const options = {
      headers: { Authorization: authorization },
      timeout: 20000,
    };

    let response: any;
    try {
      response = await this.channel.get(url, options);
    } catch (error) {
      console.error(
        `[cohort-builder] getFrontendConfig request failed for ${url}: ${error}`,
      );
      throw error;
    }

    const data = response?.data;
    // getMyConfig returns a LIST of configs; a dataset has one active PA
    // config, so we take the first (tolerating a bare object too).
    const entry = Array.isArray(data) ? data[0] : data;
    const meta = extractConfigStamp(data);
    if (!entry?.config || !meta) {
      console.error(
        `[cohort-builder] getFrontendConfig: missing config/meta. ` +
          `status=${response?.status} isArray=${Array.isArray(data)} ` +
          `hasConfig=${!!entry?.config} hasMeta=${!!meta}`,
      );
      return null;
    }
    return { config: entry.config, meta };
  }

  /**
   * Resolve the allowed values of a category/text attribute, optionally
   * filtered by a fuzzy search term. Hits the same `values` endpoint the PA UI
   * uses, so the returned `value` is exactly what the bookmark expression must
   * carry (this is what turns "male" into the dataset's coded gender value).
   * Returns `{label, value}` pairs (`label` = display text).
   */
  async getAttributeValues(
    authorization: string,
    datasetId: string,
    attributePath: string,
    configId: string,
    configVersion: string,
    searchQuery = "",
  ): Promise<{ label: string; value: string }[]> {
    const params = new URLSearchParams({
      attributePath,
      configId,
      configVersion,
      datasetId,
      searchQuery,
      attributeType: "text",
    });
    const url =
      `${this.baseURL}/analytics-svc/api/services/values?${params.toString()}`;
    const options = {
      headers: { Authorization: authorization },
      timeout: 20000,
    };
    const response = await this.channel.get(url, options);
    // Endpoint wraps the list in `data.data`, items shaped `{ value, text }`.
    const items: { value: string; text?: string }[] = response?.data?.data ?? [];
    return items.map((it) => ({ label: it.text || it.value, value: it.value }));
  }
}
