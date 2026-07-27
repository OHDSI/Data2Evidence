import { BaseAPI } from "./BaseAPI";

/**
 * Fuzzy OMOP concept search over d2e-webapi's vocabulary endpoint
 * (`POST /vocabulary/:sourceKey/search`, the same search the cohort/ATLAS UI
 * uses). Turns a clinical term into candidate standard concepts — the missing
 * rung between a plain word ("systolic blood pressure") and the concept-set
 * tools, which work in concept IDs.
 *
 * In D2E the vocabulary `sourceKey` equals the `datasetId` (each dataset is
 * registered as its own source), so we pass the datasetId as the sourceKey.
 * Results come back ranked by record count in the dataset (most-used first).
 */

export type ConceptHit = {
  conceptId: number;
  conceptName: string;
  domainId: string;
  vocabularyId: string;
  standardConcept: string;
  /**
   * The code within its own vocabulary ("44054006" in SNOMED). Optional because it
   * depends on the search endpoint returning CONCEPT_CODE. Carried through so the
   * concept-review card in the assistant panel can show a clinician the identifier
   * they recognise rather than an OMOP id.
   */
  conceptCode?: string;
};

export class VocabularyAPI extends BaseAPI {
  constructor() {
    super("d2e-webapi", "d2e-webapi");
  }

  async searchConcepts(
    authorization: string,
    datasetId: string,
    query: string,
    domain?: string,
    standardOnly = true,
    limit = 20,
  ): Promise<ConceptHit[]> {
    const body: Record<string, unknown> = {
      QUERY: query,
      DOMAIN_ID: domain ? [domain] : [],
      ...(standardOnly ? { STANDARD_CONCEPT: "S" } : {}),
    };
    // sourceKey === datasetId; page is 0-based, rowsPerPage caps the candidates.
    const path =
      `/vocabulary/${encodeURIComponent(datasetId)}/search` +
      `?page=0&rowsPerPage=${limit}`;
    const { data, status } = await this.call<any[]>(
      "post",
      path,
      { authorization, datasetId },
      body,
    );
    if (status !== 200 || !Array.isArray(data)) return [];
    return data.map((c) => ({
      conceptId: c.CONCEPT_ID,
      conceptName: c.CONCEPT_NAME,
      domainId: c.DOMAIN_ID,
      vocabularyId: c.VOCABULARY_ID,
      standardConcept: c.STANDARD_CONCEPT,
      conceptCode: c.CONCEPT_CODE != null ? String(c.CONCEPT_CODE) : undefined,
    }));
  }
}
