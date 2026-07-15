/**
 * MRI bookmarks and cohort materialization requests describe the same cohort
 * using different object shapes. This comparator extracts the cohort-defining
 * fields from either shape, normalizes object-key order, and compares the
 * resulting identities. Presentation-only fields are ignored, while malformed
 * or circular inputs are rejected so they can never cause cohort reuse.
 */
type JsonPrimitive = boolean | number | string | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

interface MriQueryProjection {
  datasetId: string;
  guarded: boolean;
  configData: {
    configId: string;
    configVersion: string;
  };
  cards: unknown;
}

const INVALID_JSON_VALUE = Symbol("invalid-json-value");

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function unwrapQueryInput(input: unknown): unknown {
  const parsedInput = parseJson(input);
  if (!isRecord(parsedInput)) {
    return parsedInput;
  }

  if (isRecord(parsedInput.filter) || isRecord(parsedInput.cohortDefinition)) {
    return parsedInput;
  }

  if (Object.prototype.hasOwnProperty.call(parsedInput, "bookmark")) {
    return parseJson(parsedInput.bookmark);
  }

  return parsedInput;
}

function readRequiredString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeJsonValue(value: unknown, ancestors: WeakSet<object>): JsonValue | typeof INVALID_JSON_VALUE {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : INVALID_JSON_VALUE;
  }

  if (Array.isArray(value)) {
    if (ancestors.has(value)) {
      return INVALID_JSON_VALUE;
    }

    ancestors.add(value);
    const normalizedValues: JsonValue[] = [];
    for (const item of value) {
      const normalizedItem = normalizeJsonValue(item, ancestors);
      if (normalizedItem === INVALID_JSON_VALUE) {
        ancestors.delete(value);
        return INVALID_JSON_VALUE;
      }
      normalizedValues.push(normalizedItem);
    }
    ancestors.delete(value);
    return normalizedValues;
  }

  if (!isRecord(value) || ancestors.has(value)) {
    return INVALID_JSON_VALUE;
  }

  ancestors.add(value);
  const normalizedRecord: { [key: string]: JsonValue } = Object.create(null);
  for (const key of Object.keys(value).sort()) {
    const normalizedItem = normalizeJsonValue(value[key], ancestors);
    if (normalizedItem === INVALID_JSON_VALUE) {
      ancestors.delete(value);
      return INVALID_JSON_VALUE;
    }
    normalizedRecord[key] = normalizedItem;
  }
  ancestors.delete(value);
  return normalizedRecord;
}

function extractBookmarkProjection(query: Record<string, unknown>): MriQueryProjection | null {
  const filter = query.filter;
  if (!isRecord(filter) || !isRecord(filter.configMetadata) || !isRecord(filter.cards)) {
    return null;
  }

  const datasetId = readRequiredString(query, "datasetId");
  const configId = readRequiredString(filter.configMetadata, "id");
  const configVersion = readRequiredString(filter.configMetadata, "version");
  if (datasetId === null || configId === null || configVersion === null) {
    return null;
  }

  return {
    datasetId,
    guarded: true,
    configData: { configId, configVersion },
    cards: filter.cards,
  };
}

function extractMaterializationProjection(query: Record<string, unknown>): MriQueryProjection | null {
  const cohortDefinition = query.cohortDefinition;
  if (!isRecord(cohortDefinition) || !isRecord(cohortDefinition.configData) || !isRecord(cohortDefinition.cards)) {
    return null;
  }

  const datasetId = readRequiredString(query, "datasetId");
  const configId = readRequiredString(cohortDefinition.configData, "configId");
  const configVersion = readRequiredString(cohortDefinition.configData, "configVersion");
  const guarded = cohortDefinition.guarded;
  if (datasetId === null || configId === null || configVersion === null || typeof guarded !== "boolean") {
    return null;
  }

  return {
    datasetId,
    guarded,
    configData: { configId, configVersion },
    cards: cohortDefinition.cards,
  };
}

/**
 * Returns a stable identity for the cohort-membership portion of an MRI query.
 *
 * Supported inputs are MRI bookmark objects/JSON, bookmark API records containing
 * a `bookmark` value, and cohort materialization request objects/JSON. Object key
 * order is ignored; array order and primitive types remain significant.
 */
export function getMriQueryIdentity(input: unknown): string | null {
  const query = unwrapQueryInput(input);
  if (!isRecord(query)) {
    return null;
  }

  const projection = extractBookmarkProjection(query) ?? extractMaterializationProjection(query);
  if (projection === null) {
    return null;
  }

  const normalizedProjection = normalizeJsonValue(projection, new WeakSet());
  return normalizedProjection === INVALID_JSON_VALUE ? null : JSON.stringify(normalizedProjection);
}

/**
 * Compares MRI inputs conservatively. Invalid inputs never match, including two
 * equally invalid values, so callers cannot accidentally reuse a cohort.
 */
export function areMriQueriesEquivalent(left: unknown, right: unknown): boolean {
  const leftIdentity = getMriQueryIdentity(left);
  if (leftIdentity === null) {
    return false;
  }

  return leftIdentity === getMriQueryIdentity(right);
}
