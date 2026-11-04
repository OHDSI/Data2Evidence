/**
 * Conditional truncation tooltips.
 *
 * The frame's note on card 2635:208762 reads: "If name/description is longer
 * than the row, it will be truncated and user should be able to view a tooltip
 * to see the full naming/description". A tooltip that is always present shows
 * even when the text fits, which is noise; D2eTruncatedText only attaches one
 * when the element actually overflows.
 */

/**
 * True when the element's content is wider than its box.
 *
 * The 1px allowance absorbs sub-pixel rounding: a fitting element can report a
 * scrollWidth a fraction larger than its clientWidth after layout scaling, and
 * without it every row would claim to be truncated.
 */
export function isTruncated(el: Pick<HTMLElement, "scrollWidth" | "clientWidth">): boolean {
  return el.scrollWidth > el.clientWidth + 1;
}
