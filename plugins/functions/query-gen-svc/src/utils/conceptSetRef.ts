// Mirror of the non-Zod runtime surface from
// plugins/functions/d2e-webapi/src/utils/conceptSetRef.ts.
//
// SOURCE OF TRUTH: d2e-webapi/src/utils/conceptSetRef.ts. Keep the parsing
// rules, regex, and offset boundary in lockstep across services. No
// cross-package imports — each Deno service carries its own copy.

export type ConceptSetSource = "legacy" | "webapi";

export interface ConceptSetRef {
  source: ConceptSetSource;
  externalId: number;
}

/**
 * Boundary above which a bare numeric concept-set id is interpreted as an
 * offset-encoded WebAPI id (back-compat with PR #2560). MUST match
 * `WEBAPI_CONCEPT_SET_ID_OFFSET` in d2e-webapi services/conceptset.service.ts
 * and the analogous mirrors elsewhere in the repo.
 */
export const CONCEPT_SET_LEGACY_OFFSET_BOUNDARY = 1_000_000_000;

/**
 * Canonical compound form: "<source>:<non-negative integer in canonical form>".
 * Only accepts "0" or a digit sequence without leading zeros (e.g. "legacy:1",
 * "webapi:42"). Rejects negatives, decimals, and leading-zero numerics like
 * "legacy:007".
 */
export const CONCEPT_SET_COMPOUND_PATTERN = /^(legacy|webapi):(0|[1-9]\d*)$/;

/**
 * Bare-numeric back-compat form: a sequence of digits (no sign, no decimal).
 */
export const CONCEPT_SET_BARE_NUMERIC_PATTERN = /^\d+$/;

const toNonNegativeInteger = (
  value: number,
  raw: string | number
): number => {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(
      `Invalid conceptSetRef: expected non-negative integer externalId, got ${JSON.stringify(raw)}`
    );
  }
  return value;
};

const parseBareNumeric = (
  value: number,
  raw: string | number
): ConceptSetRef => {
  const id = toNonNegativeInteger(value, raw);
  if (id >= CONCEPT_SET_LEGACY_OFFSET_BOUNDARY) {
    return {
      source: "webapi",
      externalId: id - CONCEPT_SET_LEGACY_OFFSET_BOUNDARY,
    };
  }
  return { source: "legacy", externalId: id };
};

export const parseConceptSetRef = (input: string | number): ConceptSetRef => {
  if (typeof input === "number") {
    return parseBareNumeric(input, input);
  }

  if (typeof input !== "string" || input.length === 0) {
    throw new Error(
      `Invalid conceptSetRef: expected non-empty string or number, got ${JSON.stringify(input)}`
    );
  }

  const compoundMatch = CONCEPT_SET_COMPOUND_PATTERN.exec(input);
  if (compoundMatch) {
    const source = compoundMatch[1] as ConceptSetSource;
    const externalId = Number(compoundMatch[2]);
    return { source, externalId: toNonNegativeInteger(externalId, input) };
  }

  // Bare numeric strings accept leading zeros (e.g. "007" -> 7) as a
  // back-compat tolerance. The compound form is canonical and strict.
  if (/^-?\d+$/.test(input)) {
    return parseBareNumeric(Number(input), input);
  }

  throw new Error(
    `Invalid conceptSetRef: unrecognised format ${JSON.stringify(input)} (expected "legacy:N" or "webapi:N")`
  );
};

export const formatConceptSetRef = (ref: ConceptSetRef): string =>
  `${ref.source}:${ref.externalId}`;

export const isConceptSetRefString = (input: unknown): boolean =>
  typeof input === "string" && CONCEPT_SET_COMPOUND_PATTERN.test(input);
