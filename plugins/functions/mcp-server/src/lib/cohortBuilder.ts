import { compress } from "./cohortUrlCodec.ts";

/**
 * Deterministic builder for the PA "Basic Data" age+gender cohort deep link.
 *
 * The LLM's job is to extract intent ({ageMin?, ageMax?, gender?}); turning
 * that into the rule-bound bookmark tree is deterministic code, because a
 * subtly wrong tree loads the WRONG cohort silently (a correctness bug in a
 * clinical tool). The tree shape mirrors buildMriBookmark (mriQuery.ts) and is
 * pinned by the round-trip oracle test against the real BMv2Parser.
 *
 * POC scope: age range + gender only. Emits the minimum bookmark the loader
 * accepts — just `filter` (+ metadata.version 3); no axisSelection/chartType.
 */

export interface CohortSpec {
  ageMin?: number;
  ageMax?: number;
  gender?: string;
}

export interface ConfigStamp {
  configId: string;
  configVersion: string;
}

/**
 * Pull the config stamp out of an analytics-svc getMyConfig response.
 *
 * getMyConfig returns a LIST of configs (verified against a live response:
 * `[{ meta: { configId, configVersion, ... }, config: {...} }]`); a dataset has
 * a single active PA config, so we take the first. Tolerates a bare object too.
 * Returns null when no stamp is present, so the caller can emit an
 * LLM-actionable "no PA config" error instead of building a broken bookmark.
 */
export function extractConfigStamp(data: unknown): ConfigStamp | null {
  const entry = Array.isArray(data) ? data[0] : data;
  const meta = (entry as any)?.meta;
  if (!meta?.configId || !meta?.configVersion) {
    return null;
  }
  return {
    configId: String(meta.configId),
    configVersion: String(meta.configVersion),
  };
}

// Attribute config paths (full paths, per mriQuery.ts:255 convention).
const AGE_PATH = "patient.attributes.Age";
const GENDER_PATH = "patient.attributes.Gender_concept_name";
// Gender is the literal display string, not a concept id (cdwConfig.ts:109).
const VALID_GENDERS = ["FEMALE", "MALE"];
// PA deep-link route + the linkType the loader requires (useDeepLink.ts).
const COHORT_ROUTE = "/d2e/portal/researcher/cohort";
const LINK_TYPE = "cohort-definition";
// CohortUrlCodec.ts:120-128 warns past this length.
const URL_WARN_THRESHOLD = 2048;

interface Expression {
  type: "Expression";
  operator: string;
  value: string | number;
}

/**
 * Validate the spec and normalise gender to its canonical FEMALE/MALE form.
 * Returns an LLM-actionable error string when invalid, mirroring DATA-651's
 * pattern, or the normalised spec when valid. Errors are returned (not thrown)
 * so the tool can surface them as text the agent can relay and act on.
 */
export function validateCohortSpec(
  spec: CohortSpec,
): { error: string } | { spec: CohortSpec } {
  const hasAge = spec.ageMin != null || spec.ageMax != null;
  const hasGender = spec.gender != null && spec.gender !== "";

  if (!hasAge && !hasGender) {
    // Prevents the silent all-patients cohort.
    return { error: "Specify at least an age range or a gender." };
  }

  if (spec.ageMin != null && spec.ageMax != null && spec.ageMin > spec.ageMax) {
    return {
      error: `ageMin (${spec.ageMin}) must not be greater than ageMax (${spec.ageMax}).`,
    };
  }

  let gender: string | undefined;
  if (hasGender) {
    gender = String(spec.gender).trim().toUpperCase();
    if (!VALID_GENDERS.includes(gender)) {
      return { error: "Gender must be FEMALE or MALE." };
    }
  }

  return { spec: { ageMin: spec.ageMin, ageMax: spec.ageMax, gender } };
}

/** Build the Age attribute: range = two Expressions under AND, single = one under OR. */
function buildAgeAttribute(ageMin?: number, ageMax?: number) {
  const expressions: Expression[] = [];
  if (ageMin != null)
    expressions.push({ type: "Expression", operator: ">=", value: ageMin });
  if (ageMax != null)
    expressions.push({ type: "Expression", operator: "<=", value: ageMax });
  return {
    type: "Attribute",
    configPath: AGE_PATH,
    instanceID: AGE_PATH,
    constraints: {
      type: "BooleanContainer",
      op: expressions.length > 1 ? "AND" : "OR",
      content: expressions,
    },
  };
}

/** Build the Gender attribute: single "=" Expression under OR. */
function buildGenderAttribute(gender: string) {
  return {
    type: "Attribute",
    configPath: GENDER_PATH,
    instanceID: GENDER_PATH,
    constraints: {
      type: "BooleanContainer",
      op: "OR",
      content: [{ type: "Expression", operator: "=", value: gender }],
    },
  };
}

/**
 * Build the minimal bookmark for a validated spec. Caller must pass a spec that
 * already passed validateCohortSpec (gender normalised, non-empty).
 */
export function buildCohortBookmark(spec: CohortSpec, config: ConfigStamp) {
  const attributes: unknown[] = [];
  if (spec.ageMin != null || spec.ageMax != null) {
    attributes.push(buildAgeAttribute(spec.ageMin, spec.ageMax));
  }
  if (spec.gender) {
    attributes.push(buildGenderAttribute(spec.gender));
  }

  const filterCard = {
    type: "FilterCard",
    configPath: "patient",
    instanceNumber: 1,
    instanceID: "patient",
    name: "Basic Data",
    inactive: false,
    attributes: { type: "BooleanContainer", op: "AND", content: attributes },
  };

  return {
    filter: {
      configMetadata: { id: config.configId, version: config.configVersion },
      // Standard nesting: AND > [ OR > FilterCard ] (mriQuery.ts:292-297).
      cards: {
        type: "BooleanContainer",
        op: "AND",
        content: [
          { type: "BooleanContainer", op: "OR", content: [filterCard] },
        ],
      },
    },
    metadata: { version: 3 },
  };
}

/**
 * Assemble the deep-link URL and flag if it exceeds the loader's warn length.
 */
export function buildDeepLinkUrl(
  bookmark: unknown,
  datasetId: string,
): { url: string; tooLong: boolean } {
  const query = compress(bookmark);
  const params = new URLSearchParams({ datasetId, linkType: LINK_TYPE });
  // query is base64url (no +,/,=) so it is URL-safe; append raw to avoid
  // re-encoding it into standard base64 escapes.
  const url = `${COHORT_ROUTE}?${params.toString()}&query=${query}`;
  return { url, tooLong: url.length > URL_WARN_THRESHOLD };
}
