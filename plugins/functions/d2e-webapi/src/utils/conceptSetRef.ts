export type ConceptSetSource = "legacy" | "webapi";

export interface ConceptSetRef {
  source: ConceptSetSource;
  externalId: number;
}

/**
 * Boundary above which a bare numeric concept-set id is interpreted as an
 * offset-encoded WebAPI id (back-compat with PR #2560). MUST match
 * `WEBAPI_CONCEPT_SET_ID_OFFSET` in services/conceptset.service.ts.
 */
export const CONCEPT_SET_LEGACY_OFFSET_BOUNDARY = 1_000_000_000;

const COMPOUND_PATTERN = /^(legacy|webapi):(-?\d+(?:\.\d+)?)$/;

const toNonNegativeInteger = (value: number, raw: string | number): number => {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(
      `Invalid conceptSetRef: expected non-negative integer externalId, got ${JSON.stringify(raw)}`,
    );
  }
  return value;
};

const parseBareNumeric = (value: number, raw: string | number): ConceptSetRef => {
  const id = toNonNegativeInteger(value, raw);
  if (id >= CONCEPT_SET_LEGACY_OFFSET_BOUNDARY) {
    return { source: "webapi", externalId: id - CONCEPT_SET_LEGACY_OFFSET_BOUNDARY };
  }
  return { source: "legacy", externalId: id };
};

export const parseConceptSetRef = (input: string | number): ConceptSetRef => {
  if (typeof input === "number") {
    return parseBareNumeric(input, input);
  }

  if (typeof input !== "string" || input.length === 0) {
    throw new Error(
      `Invalid conceptSetRef: expected non-empty string or number, got ${JSON.stringify(input)}`,
    );
  }

  const compoundMatch = COMPOUND_PATTERN.exec(input);
  if (compoundMatch) {
    const source = compoundMatch[1] as ConceptSetSource;
    const externalId = Number(compoundMatch[2]);
    return { source, externalId: toNonNegativeInteger(externalId, input) };
  }

  if (/^-?\d+$/.test(input)) {
    return parseBareNumeric(Number(input), input);
  }

  throw new Error(
    `Invalid conceptSetRef: unrecognised format ${JSON.stringify(input)} (expected "legacy:N" or "webapi:N")`,
  );
};

export const formatConceptSetRef = (ref: ConceptSetRef): string =>
  `${ref.source}:${ref.externalId}`;

export const isConceptSetRefString = (input: unknown): boolean =>
  typeof input === "string" && COMPOUND_PATTERN.test(input);
