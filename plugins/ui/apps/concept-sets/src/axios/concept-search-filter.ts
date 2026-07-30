/**
 * Maps D2E's multi-select validity facet to WebAPI's scalar INVALID_REASON.
 * Selecting both exhaustive values is equivalent to no validity restriction,
 * so omit the field instead of making the result depend on selection order.
 */
export const getInvalidReasonFilter = (
  validity: string[],
): string | undefined => {
  return validity.length === 1 ? validity[0] : undefined;
};
